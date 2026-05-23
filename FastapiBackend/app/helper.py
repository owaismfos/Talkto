# from passlib.context import CryptContext
from argon2 import PasswordHasher
from fastapi import HTTPException, Depends
from datetime import datetime, timedelta, timezone, date
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.inspection import inspect
import jwt
import os
import secrets
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from pathlib import Path

from .models import Chat, Contact


load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Setup password hashing
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ph = PasswordHasher()
bearer_scheme = HTTPBearer()

def hash_password(password: str):
    return ph.hash(password)

def verify_password(plain_password, hashed_password):
    try:
        return ph.verify(hashed_password, plain_password)
    except Exception as e:
        print("Error occurred while verifying password:", str(e))
        return False


def create_access_token(user_id: str, session_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"user_id": user_id, "session_id": session_id, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM
    )

def create_refresh_token() -> str:
    # Long random string — NOT a JWT, stored in DB
    return secrets.token_urlsafe(64)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    token = credentials.credentials  # extracts token from "Bearer <token>"
    print("Received JWT token:", token)  # Debugging line
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("Decoded JWT payload:", payload)  # Debugging line
        user_id = payload.get("user_id")
        session_id = payload.get("session_id")
        if user_id is None or session_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "session_id": session_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
def format_date(d):
    print("date: ", d)
    today = date.today()

    if d == today:
        return "Today"
    elif d == today - timedelta(days=1):
        return "Yesterday"
    else:
        return d.strftime("%Y-%m-%d")
    
def format_time(dt):
    return dt.strftime("%I:%M %p").replace(' ', '')

def format_date_time(utc_time):
    # Attach UTC timezone if missing
    if utc_time.tzinfo is None:
        utc_time = utc_time.replace(tzinfo=timezone.utc)

    ist_time = utc_time.astimezone(ZoneInfo("Asia/Kolkata"))

    print("UTC:", utc_time)
    print("IST:", ist_time)

    return f"{format_date(ist_time.date())} {format_time(ist_time)}"
    
def add_chat_user(current_user_id: str, chat_user_id: str, db: Session):
    # Check if the chat already exists
    existing_chat = db.query(Chat).filter(
        (Chat.owner_id == current_user_id) & (Chat.chat_user_id == chat_user_id)
    ).first()

    if existing_chat:
        return
    
    contact = db.query(Contact).filter(
        (Contact.owner_id == current_user_id) & (Contact.contact_id == chat_user_id)
    ).first()

    # Create a new chat entry for both users
    chat = Chat(owner_id=current_user_id, chat_user_id=chat_user_id, nickname=contact.nickname if contact else None)
    db.add(chat)
    db.commit()
    

def model_to_dict(obj):
    return {c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs}
