
"""
Authentication Service for CrowdCare
Handles JWT tokens, password hashing, and user authentication
"""

from jose import jwt, JWTError, ExpiredSignatureError
import bcrypt
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from models import User, RefreshToken
from schemas import UserRegister, UserLogin, TokenResponse, UserResponse, UserProfileUpdate
from database import get_db

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.secret_key = "your-secret-key-here"  # Should be from environment
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire, "type": "access"})
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create a refresh token"""
        token_data = {
            "user_id": user_id,
            "type": "refresh",
            "jti": secrets.token_urlsafe(32)  # Unique token ID
        }
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        token_data.update({"exp": expire})
        
        token = jwt.encode(token_data, self.secret_key, algorithm=self.algorithm)
        return token
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("type") != token_type:
                return None
                
            return payload
        except ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except JWTError:
            logger.warning("Invalid token")
            return None
    
    async def register_user(self, db: Session, user_data: UserRegister) -> UserResponse:
        """Register a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Validate password confirmation
        if user_data.password != user_data.confirm_password:
            raise ValueError("Passwords do not match")
        
        # Hash password
        hashed_password = self.hash_password(user_data.password)
        
        # Create user
        user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            mobile_number=user_data.mobile_number,
            role=user_data.role
        )
        
        # Add admin-specific fields if applicable
        if user_data.role == "admin" and hasattr(user_data, 'admin_id'):
            user.admin_id = user_data.admin_id
            user.municipality_name = getattr(user_data, 'municipality_name', None)
            user.department_name = getattr(user_data, 'department_name', None)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return UserResponse.model_validate(user)
    
    async def authenticate_user(self, db: Session, login_data: UserLogin) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = db.query(User).filter(
            and_(
                User.email == login_data.email,
                User.role == login_data.role,
                User.is_active == True
            )
        ).first()
        
        if not user:
            return None
        
        if not self.verify_password(login_data.password, user.password_hash):
            return None
        
        return user
    
    async def login_user(self, db: Session, login_data: UserLogin) -> TokenResponse:
        """Login a user and return tokens"""
        user = await self.authenticate_user(db, login_data)
        if not user:
            raise ValueError("Invalid credentials")
        
        # Create tokens
        access_token = self.create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        })
        
        refresh_token = self.create_refresh_token(str(user.id))
        
        # Store refresh token in database
        refresh_token_record = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        )
        db.add(refresh_token_record)
        db.commit()
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
    
    async def refresh_access_token(self, db: Session, refresh_token: str) -> TokenResponse:
        """Refresh an access token using a refresh token"""
        # Verify refresh token
        payload = self.verify_token(refresh_token, "refresh")
        if not payload:
            raise ValueError("Invalid refresh token")
        
        # Check if refresh token exists in database
        token_record = db.query(RefreshToken).filter(
            and_(
                RefreshToken.token == refresh_token,
                RefreshToken.expires_at > datetime.utcnow()
            )
        ).first()
        
        if not token_record:
            raise ValueError("Refresh token not found or expired")
        
        # Get user
        user = db.query(User).filter(User.id == token_record.user_id).first()
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")
        
        # Create new access token
        access_token = self.create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        })
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,  # Keep the same refresh token
            user=UserResponse.model_validate(user)
        )
    
    async def logout_user(self, db: Session, refresh_token: str) -> bool:
        """Logout a user by invalidating refresh token"""
        token_record = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token
        ).first()
        
        if token_record:
            db.delete(token_record)
            db.commit()
            return True
        
        return False
    
    async def get_current_user(self, db: Session, token: str) -> Optional[User]:
        """Get current user from access token"""
        payload = self.verify_token(token, "access")
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = db.query(User).filter(
            and_(
                User.id == user_id,
                User.is_active == True
            )
        ).first()
        
        return user
    
    async def update_user_profile(self, db: Session, user_id: str, profile_data: UserProfileUpdate) -> User:
        """Update user profile information"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Update fields if provided
        if profile_data.full_name is not None:
            user.full_name = profile_data.full_name
        
        if profile_data.email is not None:
            # Check if email is already taken by another user
            existing_user = db.query(User).filter(
                and_(
                    User.email == profile_data.email,
                    User.id != user_id
                )
            ).first()
            if existing_user:
                raise ValueError("Email already exists")
            user.email = profile_data.email
        
        if profile_data.mobile_number is not None:
            user.mobile_number = profile_data.mobile_number
        
        db.commit()
        db.refresh(user)
        
        return user

# Global instance
auth_service = AuthService()
