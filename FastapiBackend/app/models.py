import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from .database import Base # Ensure this matches your project structure

class User(Base):
    __tablename__ = "users"

    # id char(36) PK
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # phone_number varchar(20) - Added index for faster login lookups
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    
    # username varchar(50)
    username = Column(String(50), unique=True, nullable=True)
    
    # password_hash varchar(255)
    password_hash = Column(String(255), nullable=False)
    
    # avatar_url text
    avatar_url = Column(Text, nullable=True)
    
    # is_active tinyint
    is_active = Column(Integer, default=1)
    
    # created_at datetime(3)
    created_at = Column(DateTime(timezone=False), default=lambda: datetime.now(timezone.utc))
    
    # last_seen datetime(3)
    last_seen = Column(DateTime(timezone=False), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship to the Session model
    sessions = relationship("UserSession", backref="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "sessions"

    # char(36) PK - UUIDs are typically stored this way
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # char(36) Foreign Key to your users table
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # varchar(512) for the long refresh token string
    refresh_token = Column(String(512), nullable=False, index=True)
    
    # Device information
    device_id = Column(String(255), nullable=True)
    device_name = Column(String(100), nullable=True)
    
    # text for FCM (can be quite long)
    fcm_token = Column(Text, nullable=True)
    
    # tinyint usually maps to Boolean or Integer in SQLAlchemy
    is_active = Column(Integer, default=1) 
    
    # datetime(3) for millisecond precision
    created_at = Column(DateTime(timezone=False), default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=False), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Optional: Relationship to the User model
    # user = relationship("User", back_populates="sessions")

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), nullable=False)
    contact_id = Column(String(36), nullable=False)
    nickname = Column(String(100), nullable=True)
    added_at = Column(DateTime(timezone=False), default=lambda: datetime.now(timezone.utc))


class Chat(Base):
    __tablename__ = "chats"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), nullable=False)
    chat_user_id = Column(String(36), nullable=False)
    nickname = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=False), default=lambda: datetime.now(timezone.utc))


# Enums
class MessageType(str, enum.Enum):
    text = "text"
    image = "image"
    video = "video"
    audio = "audio"
    file = "file"


class MessageStatus(str, enum.Enum):
    sent = "sent"
    delivered = "delivered"
    read = "read"


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    sender_id = Column(String(36), nullable=False)
    receiver_id = Column(String(36), nullable=False)

    content = Column(Text, nullable=True)

    msg_type = Column(Enum(MessageType), default=MessageType.text)
    media_url = Column(Text, nullable=True)

    status = Column(Enum(MessageStatus), default=MessageStatus.sent)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    read_at = Column(DateTime(timezone=True), nullable=True)