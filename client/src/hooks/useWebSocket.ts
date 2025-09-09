import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  report_id?: number;
  old_status?: string;
  new_status?: string;
  changed_by?: string;
  timestamp?: string;
  notes?: string;
  evidence_url?: string;
  admin_coordinates?: {
    lat: number;
    lng: number;
  };
  distance_meters?: number;
  resolved_at?: string;
  // Upvote update
  total_upvotes?: number;
  user_id?: string;
  action?: 'added' | 'removed';
  // Comment new
  comment_id?: number;
  user_name?: string;
  comment?: string;
  created_at?: string;
}

interface UseWebSocketOptions {
  reportIds?: number[];
  onStatusUpdate?: (message: WebSocketMessage) => void;
  onResolutionUpdate?: (message: WebSocketMessage) => void;
  onUpvoteUpdate?: (message: WebSocketMessage) => void;
  onCommentNew?: (message: WebSocketMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!user?.id) return;

    try {
      // Use wss:// for production, ws:// for development
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/${user.id}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;

        // Subscribe to specific reports if provided
        if (options.reportIds && options.reportIds.length > 0) {
          sendMessage({
            type: 'subscribe_reports',
            report_ids: options.reportIds
          });
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'status_update':
              console.log('Status update received:', message);
              options.onStatusUpdate?.(message);
              break;
            case 'resolution_update':
              console.log('Resolution update received:', message);
              options.onResolutionUpdate?.(message);
              break;
            case 'upvote_update':
              console.log('Upvote update received:', message);
              options.onUpvoteUpdate?.(message);
              break;
            case 'comment_new':
              console.log('New comment received:', message);
              options.onCommentNew?.(message);
              break;
            case 'subscribed':
              console.log('Subscribed to reports:', message);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Failed to reconnect after multiple attempts');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  };

  const subscribeToReports = (reportIds: number[]) => {
    sendMessage({
      type: 'subscribe_reports',
      report_ids: reportIds
    });
  };

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    connectionError,
    sendMessage,
    subscribeToReports,
    connect,
    disconnect
  };
}
