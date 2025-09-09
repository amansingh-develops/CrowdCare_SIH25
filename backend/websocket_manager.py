"""
WebSocket Manager for Real-time Updates
Handles WebSocket connections and broadcasting status updates
"""

import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active connections by user ID
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store connections by report ID for targeted updates
        self.report_connections: Dict[int, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, report_ids: List[int] = None):
        """Accept a WebSocket connection and register it"""
        await websocket.accept()
        
        # Add to user connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        # Add to report connections if specified
        if report_ids:
            for report_id in report_ids:
                if report_id not in self.report_connections:
                    self.report_connections[report_id] = set()
                self.report_connections[report_id].add(websocket)
        
        logger.info(f"WebSocket connected for user {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: str, report_ids: List[int] = None):
        """Remove a WebSocket connection"""
        # Remove from user connections
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Remove from report connections
        if report_ids:
            for report_id in report_ids:
                if report_id in self.report_connections:
                    self.report_connections[report_id].discard(websocket)
                    if not self.report_connections[report_id]:
                        del self.report_connections[report_id]
        
        logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def broadcast_to_user(self, user_id: str, message: dict):
        """Broadcast a message to all connections of a specific user"""
        if user_id in self.active_connections:
            message_str = json.dumps(message)
            disconnected = set()
            
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message_str)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Clean up disconnected connections
            for websocket in disconnected:
                self.active_connections[user_id].discard(websocket)
    
    async def broadcast_to_report(self, report_id: int, message: dict):
        """Broadcast a message to all connections watching a specific report"""
        if report_id in self.report_connections:
            message_str = json.dumps(message)
            disconnected = set()
            
            for websocket in self.report_connections[report_id]:
                try:
                    await websocket.send_text(message_str)
                except Exception as e:
                    logger.error(f"Error broadcasting to report {report_id}: {e}")
                    disconnected.add(websocket)
            
            # Clean up disconnected connections
            for websocket in disconnected:
                self.report_connections[report_id].discard(websocket)
    
    async def broadcast_status_update(self, report_id: int, old_status: str, new_status: str, 
                                    changed_by: str, timestamp: str, notes: str = None):
        """Broadcast a status update to relevant connections"""
        message = {
            "type": "status_update",
            "report_id": report_id,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": changed_by,
            "timestamp": timestamp,
            "notes": notes,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Broadcast to all connections watching this report
        await self.broadcast_to_report(report_id, message)
        
        logger.info(f"Broadcasted status update for report {report_id}: {old_status} -> {new_status}")
    
    async def broadcast_resolution_update(self, report_id: int, evidence_url: str, 
                                        admin_coordinates: dict, distance_meters: float):
        """Broadcast a resolution update with evidence"""
        message = {
            "type": "resolution_update",
            "report_id": report_id,
            "evidence_url": evidence_url,
            "admin_coordinates": admin_coordinates,
            "distance_meters": distance_meters,
            "resolved_at": datetime.utcnow().isoformat()
        }
        
        # Broadcast to all connections watching this report
        await self.broadcast_to_report(report_id, message)
        
        logger.info(f"Broadcasted resolution update for report {report_id}")

    async def broadcast_upvote_update(self, report_id: int, total_upvotes: int, user_id: str, action: str):
        """Broadcast an upvote toggle event to listeners of the report.
        action: 'added' | 'removed'
        """
        message = {
            "type": "upvote_update",
            "report_id": report_id,
            "total_upvotes": total_upvotes,
            "user_id": user_id,
            "action": action,
            "updated_at": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_report(report_id, message)
        logger.info(f"Broadcasted upvote update for report {report_id}: {action}, total={total_upvotes}")

    async def broadcast_comment_new(self, report_id: int, comment_id: int, user_id: str, comment: str, created_at: str, user_name: str = None):
        """Broadcast a new comment event to listeners of the report."""
        message = {
            "type": "comment_new",
            "report_id": report_id,
            "comment_id": comment_id,
            "user_id": user_id,
            "user_name": user_name,
            "comment": comment,
            "created_at": created_at
        }
        await self.broadcast_to_report(report_id, message)
        logger.info(f"Broadcasted new comment for report {report_id} by {user_id}")

    async def broadcast_gamification_event(self, user_id: str, event: dict):
        """Broadcast a gamification event to a specific user.
        Example events:
        - {"type": "points_update", "delta": 50, "total": 1400}
        - {"type": "badge_unlocked", "badge": "Verified Reporter II", "points_added": 50}
        - {"type": "streak_update", "streak_days": 8}
        """
        try:
            await self.broadcast_to_user(user_id, event)
        except Exception as e:
            logger.error(f"Error broadcasting gamification event to {user_id}: {e}")

# Global WebSocket manager instance
websocket_manager = ConnectionManager()
