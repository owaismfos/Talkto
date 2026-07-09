from datetime import datetime, timedelta, timezone
from pathlib import Path
import uuid

from app.database import Base, engine, get_db
from .helper import *
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from sqlalchemy.orm import Session
from sqlalchemy import or_
from collections import defaultdict
from .models import (
    CallHistory,
    Chat,
    Contact,
    Group,
    GroupMember,
    Message,
    MessageType,
    StatusUpdate,
    User,
    UserSession,
)
from .socket_manager import ConnectionManager
import time

Base.metadata.create_all(bind=engine)

manager = ConnectionManager()
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_SIZE = 25 * 1024 * 1024
ALLOWED_MEDIA_PREFIXES = ("image/", "video/", "audio/")
ALLOWED_FILE_TYPES = {
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
}

# Create FastAPI instance
app = FastAPI(
    title="My FastAPI Application",
    description="A sample FastAPI application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Pydantic models (schemas)
class LoginRequest(BaseModel):
    phone_number: str
    password: str
    device_id: str
    device_name: str
    fcm_token: str | None

class RefreshRequest(BaseModel):
    refresh_token: str

class ResetPasswordRequest(BaseModel):
    phone_number: str
    password: str


class AddContact(BaseModel):
    contact_number: str
    nickname : str


class CreateStatusRequest(BaseModel):
    content: str | None = None
    media_url: str | None = None
    status_type: str = "text"


class CreateCallRequest(BaseModel):
    contact_id: str
    contact_name: str | None = None
    direction: str
    call_type: str
    status: str = "ringing"
    duration_seconds: int = 0
    started_at: datetime | None = None
    ended_at: datetime | None = None


class UpdateCallRequest(BaseModel):
    status: str
    duration_seconds: int = 0
    ended_at: datetime | None = None


class CreateGroupRequest(BaseModel):
    name: str
    description: str | None = None
    member_ids: list[str] = []
    member_phone_numbers: list[str] = []


class AddGroupMemberRequest(BaseModel):
    member_id: str | None = None
    phone_number: str | None = None


def get_message_type(content_type: str | None) -> str:
    if not content_type:
        return "file"
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    if content_type.startswith("audio/"):
        return "audio"
    return "file"


def get_message_preview(message: Message | None) -> str | None:
    if not message:
        return None
    if message.content:
        return message.content
    msg_type = message.msg_type.value if hasattr(message.msg_type, "value") else str(message.msg_type)
    labels = {
        "image": "Photo",
        "video": "Video",
        "audio": "Audio",
        "file": "File",
    }
    return f"[{labels.get(msg_type, 'Attachment')}]"


def enum_value(value):
    return value.value if hasattr(value, "value") else value


def isoformat(dt: datetime | None) -> str | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def serialize_message(message: Message, current_user_id: str) -> dict:
    created_at = message.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content,
        "msg_type": enum_value(message.msg_type),
        "media_url": message.media_url,
        "status": enum_value(message.status),
        "created_at": isoformat(created_at),
        "formatted_time": created_at.strftime("%I:%M %p") if created_at else "",
        "read_at": isoformat(message.read_at),
        "sender": "me" if message.sender_id == current_user_id else "them",
    }


def get_contact_name(db: Session, owner_id: str, user_id: str, fallback: str | None = None) -> str:
    contact = db.query(Contact).filter(
        Contact.owner_id == owner_id,
        Contact.contact_id == user_id,
    ).first()
    if contact and contact.nickname:
        return contact.nickname

    user = db.query(User).filter(User.id == user_id).first()
    return fallback or (user.phone_number if user else "Unknown")


def serialize_status(status: StatusUpdate, db: Session, current_user_id: str) -> dict:
    return {
        "id": status.id,
        "user_id": status.user_id,
        "name": "My status" if status.user_id == current_user_id else get_contact_name(db, current_user_id, status.user_id),
        "content": status.content,
        "media_url": status.media_url,
        "status_type": enum_value(status.status_type),
        "time": format_date_time(status.created_at),
        "created_at": isoformat(status.created_at),
        "expires_at": isoformat(status.expires_at),
        "seen": status.user_id == current_user_id,
    }


def serialize_call(call: CallHistory, db: Session, current_user_id: str) -> dict:
    return {
        "id": call.id,
        "contact_id": call.peer_id,
        "name": get_contact_name(db, current_user_id, call.peer_id, call.peer_name),
        "direction": enum_value(call.direction),
        "type": enum_value(call.call_type),
        "status": enum_value(call.status),
        "duration_seconds": call.duration_seconds or 0,
        "time": format_date_time(call.started_at),
        "started_at": isoformat(call.started_at),
        "ended_at": isoformat(call.ended_at),
    }


def serialize_group(group: Group, db: Session, include_members: bool = False) -> dict:
    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    data = {
        "id": group.id,
        "name": group.name,
        "description": group.description or "",
        "owner_id": group.owner_id,
        "members_count": len(members),
        "members": f"{len(members)} member{'s' if len(members) != 1 else ''}",
        "created_at": isoformat(group.created_at),
    }
    if include_members:
        data["member_list"] = [
            {
                "id": member.user_id,
                "name": get_contact_name(db, group.owner_id, member.user_id),
                "role": member.role,
                "joined_at": isoformat(member.joined_at),
            }
            for member in members
        ]
    return data


def add_group_member_once(db: Session, group_id: str, user_id: str, role: str = "member") -> GroupMember:
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if member:
        return member

    member = GroupMember(group_id=group_id, user_id=user_id, role=role)
    db.add(member)
    return member
# In-memory storage (replace with database)
# items_db = []
# counter = 1

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI"}

@app.post("/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.phone_number == request.phone_number).first()

        if not user:
            # 2. Create user if not found (Registration)
            new_user = User(
                phone_number=request.phone_number,
                password_hash=hash_password(request.password) # Hash before saving
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user
        else:
            if not verify_password(request.password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid credentials")

        refresh_token = create_refresh_token()
        session = db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.device_id == request.device_id,
            UserSession.is_active == 1
        ).first()

        if session:
            # 2. Update existing session
            session.refresh_token = refresh_token
            session.fcm_token = request.fcm_token
            session.is_active = 1
            session.last_used_at = datetime.now(timezone.utc)
        else:
            # 3. Create brand new session
            session = UserSession(
                user_id=user.id,
                refresh_token=refresh_token,
                device_id=request.device_id,
                device_name=request.device_name,
                fcm_token=request.fcm_token,
                is_active=1
            )
            db.add(session)

        update_sessions = db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.device_id != request.device_id,
            UserSession.is_active == 1,
        ).update({ "is_active": 0 })

        db.commit()
        db.refresh(session)

        # 4. Generate JWT Token
        token = create_access_token(user_id=user.id, session_id=session.id) # Pass session_id to link token with session})

        return {
            "message": "Login successful",
            "access_token": token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_id": user.id
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback() # Important to rollback on DB errors
        raise HTTPException(status_code=500, detail= str(e))
    
@app.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, db=Depends(get_db)):
    # Implementation for resetting password
    user = db.query(User).filter(User.phone_number == request.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash=hash_password(request.password)
    db.commit()
    return {"message": "Password reset successful"}

@app.post("/auth/refresh")
async def refresh(req: RefreshRequest, db=Depends(get_db)):
    # session = await db.fetchrow(
    #     """SELECT * FROM sessions
    #        WHERE refresh_token=$1 AND is_active=true""",
    #     req.refresh_token
    # )
    session = db.query(UserSession).filter(
        UserSession.refresh_token == req.refresh_token,
        UserSession.is_active == 1
    ).first()
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    # Update last_used_at
    # await db.execute(
    #     "UPDATE sessions SET last_used_at=NOW() WHERE id=$1", session["id"]
    # )
    session.last_used_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "access_token": create_access_token(
            str(session.user_id), str(session.id)
        )
    }
    
@app.post("/auth/logout")
async def logout(current=Depends(get_current_user), db=Depends(get_db)):
    # await db.execute(
    #     "UPDATE sessions SET is_active=false WHERE id=$1",
    #     current["session_id"]
    # )
    updated = (db.query(UserSession)
        .filter(UserSession.id == current["session_id"])
        .update({ "is_active": 0 })   # returns row count
    )
    
    db.commit()
    return {"message": "Logged out"}


@app.get("/auth/validate")
async def validate(current=Depends(get_current_user)):
    # Called by Node.js gateway to verify any request
    return {"valid": True, "user_id": current["user_id"]}

@app.get("/users/{user_id}")
def get_user(
    user_id: str, 
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    date_str = format_date(user.last_seen.date())
    time_str = user.last_seen.strftime("%I:%M %p")
    if date_str == "Today":
        last_seen = str(time_str)
    else:
        last_seen = f"{date_str} {time_str}"

    conn = manager.get_socket(user_id)  # This will print the last seen update in the ConnectionManager
    if conn:
        last_seen = "Online"
    return {
        "id": user.id,
        "phone_number": user.phone_number,
        "last_seen": last_seen
    }

@app.get("/contacts")
async def get_contacts(
    current=Depends(get_current_user),
    db=Depends(get_db)
):
    contacts = (
        db.query(Contact)
        .filter(Contact.owner_id == current["user_id"])
        .order_by(Contact.nickname.asc(), Contact.added_at.desc())
        .all()
    )
    return {"contacts": [
        {
            "id": c.contact_id,
            "nickname": c.nickname,
            "added_at": isoformat(c.added_at)
        } for c in contacts
    ]}

@app.post("/contacts")
async def contacts_post(
    req: Request, 
    current=Depends(get_current_user), 
    db=Depends(get_db)
):

    # print("Received contact data:", await req.body())  # Debugging line to check incoming data
    # time.sleep(2)  # Simulate processing delay (for testing)
    data = await req.json()
    print(data)
    contact_number = (data.get("contact_number") or "").strip()
    nickname = (data.get("nickname") or "").strip()
    if not contact_number:
        raise HTTPException(status_code=400, detail="Contact number is required")
    if not nickname:
        raise HTTPException(status_code=400, detail="Nickname is required")

    user = db.query(User).filter(User.phone_number == contact_number).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    if user.id == current["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot add yourself as a contact")
    
    contract = db.query(Contact).filter(
        Contact.owner_id == current["user_id"],
        Contact.contact_id == user.id
    ).first()
    if not contract:
        contract = Contact(
            owner_id=current["user_id"],
            contact_id=user.id,
            nickname=nickname
        )
        db.add(contract)
        db.commit()
    else:
        contract.nickname = nickname
        db.commit()
    return {"message": "Contact added successfully"}
    
@app.put("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    req: Request,
    current=Depends(get_current_user),
    db=Depends(get_db)
):
    data = await req.json()

    contact = db.query(Contact).filter(
        Contact.owner_id == current["user_id"],
        Contact.contact_id == contact_id,
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.nickname = data.get("nickname", contact.nickname)
    db.commit()

    return {"message": "Contact updated successfully"}  
    
@app.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    contact = db.query(Contact).filter(
        Contact.contact_id == contact_id,
        Contact.owner_id == current["user_id"]
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.delete(contact)
    db.commit()

    return {"message": "Contact deleted successfully"}

@app.get("/chats/users")
def get_user_chats(
    current=Depends(get_current_user),
    db=Depends(get_db)
):
    try:    
        chats = db.query(Chat).filter(Chat.owner_id == current["user_id"]).all()
        users = []
        for chat in chats:
            contact = db.query(Contact).filter(
                Contact.owner_id == current["user_id"],
                Contact.contact_id == chat.chat_user_id
            ).first()
            user = db.query(User).filter(User.id == chat.chat_user_id).first()
            last_message = db.query(Message).filter(
                or_(
                    (Message.sender_id == current["user_id"]) & (Message.receiver_id == chat.chat_user_id),
                    (Message.sender_id == chat.chat_user_id) & (Message.receiver_id == current["user_id"]),
                )
            ).order_by(Message.created_at.desc()).first()
            display_name = (
                contact.nickname
                if contact and contact.nickname
                else chat.nickname
                if chat.nickname
                else user.phone_number
                if user
                else "Unknown"
            )
            users.append({
                "id": chat.chat_user_id,
                "name": display_name,
                "status": "Available",  # Placeholder, you can enhance this to show actual status
                "last_message": get_message_preview(last_message),
                "last_message_time": format_date_time(last_message.created_at) if last_message else None,
                "lastSeen": "Available",
                "unreadCount": 0,
                "time": format_date_time(last_message.created_at) if last_message else "",
                "sort_time": isoformat(last_message.created_at) if last_message else None,
                "_sort_time": last_message.created_at if last_message else None,
            })
        # Sort recent messages first
        users.sort(
            key=lambda x: x["_sort_time"].timestamp() if x["_sort_time"] else 0,
            reverse=True
        )
        for user in users:
            user.pop("_sort_time", None)
        return {"users": users}

    except Exception as e:
        # db.rollback() # Important to rollback on DB errors
        raise HTTPException(status_code=500, detail= str(e))


@app.get("/statuses")
def get_statuses(
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact_ids = [
        row.contact_id
        for row in db.query(Contact).filter(Contact.owner_id == current["user_id"]).all()
    ]
    visible_user_ids = contact_ids + [current["user_id"]]
    now = datetime.now(timezone.utc)
    statuses = (
        db.query(StatusUpdate)
        .filter(StatusUpdate.user_id.in_(visible_user_ids))
        .filter(StatusUpdate.expires_at > now)
        .order_by(StatusUpdate.created_at.desc())
        .all()
    )
    return {
        "statuses": [
            serialize_status(status, db, current["user_id"])
            for status in statuses
        ]
    }


@app.post("/statuses", status_code=201)
async def create_status(
    req: CreateStatusRequest,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.content and not req.media_url:
        raise HTTPException(status_code=400, detail="Status content or media is required")
    if req.status_type not in ["text", "image", "video"]:
        raise HTTPException(status_code=400, detail="Unsupported status type")

    status = StatusUpdate(
        user_id=current["user_id"],
        content=req.content,
        media_url=req.media_url,
        status_type=req.status_type,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(status)
    db.commit()
    db.refresh(status)
    return {"status": serialize_status(status, db, current["user_id"])}


@app.delete("/statuses/{status_id}")
def delete_status(
    status_id: str,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status = db.query(StatusUpdate).filter(
        StatusUpdate.id == status_id,
        StatusUpdate.user_id == current["user_id"],
    ).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")

    db.delete(status)
    db.commit()
    return {"message": "Status deleted successfully"}


@app.get("/calls")
def get_calls(
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    calls = (
        db.query(CallHistory)
        .filter(CallHistory.owner_id == current["user_id"])
        .order_by(CallHistory.started_at.desc())
        .limit(100)
        .all()
    )
    return {"calls": [serialize_call(call, db, current["user_id"]) for call in calls]}


@app.post("/calls", status_code=201)
def create_call(
    req: CreateCallRequest,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.direction not in ["incoming", "outgoing", "missed"]:
        raise HTTPException(status_code=400, detail="Invalid call direction")
    if req.call_type not in ["voice", "video"]:
        raise HTTPException(status_code=400, detail="Invalid call type")
    if req.status not in ["ringing", "accepted", "rejected", "missed", "ended"]:
        raise HTTPException(status_code=400, detail="Invalid call status")

    peer = db.query(User).filter(User.id == req.contact_id).first()
    if not peer:
        raise HTTPException(status_code=404, detail="Contact user not found")

    call = CallHistory(
        owner_id=current["user_id"],
        peer_id=req.contact_id,
        peer_name=req.contact_name,
        direction=req.direction,
        call_type=req.call_type,
        status=req.status,
        duration_seconds=max(req.duration_seconds, 0),
        started_at=req.started_at or datetime.now(timezone.utc),
        ended_at=req.ended_at,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return {"call": serialize_call(call, db, current["user_id"])}


@app.put("/calls/{call_id}")
def update_call(
    call_id: str,
    req: UpdateCallRequest,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.status not in ["ringing", "accepted", "rejected", "missed", "ended"]:
        raise HTTPException(status_code=400, detail="Invalid call status")
    call = db.query(CallHistory).filter(
        CallHistory.id == call_id,
        CallHistory.owner_id == current["user_id"],
    ).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    call.status = req.status
    call.duration_seconds = max(req.duration_seconds, 0)
    call.ended_at = req.ended_at or datetime.now(timezone.utc)
    if req.status == "missed":
        call.direction = "missed"
    db.commit()
    db.refresh(call)
    return {"call": serialize_call(call, db, current["user_id"])}


@app.get("/groups")
def get_groups(
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current["user_id"]).all()
    group_ids = [membership.group_id for membership in memberships]
    if not group_ids:
        return {"groups": []}

    groups = (
        db.query(Group)
        .filter(Group.id.in_(group_ids))
        .order_by(Group.created_at.desc())
        .all()
    )
    return {"groups": [serialize_group(group, db) for group in groups]}


@app.post("/groups", status_code=201)
def create_group(
    req: CreateGroupRequest,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")

    group = Group(
        name=name,
        description=req.description,
        owner_id=current["user_id"],
    )
    db.add(group)
    db.flush()
    add_group_member_once(db, group.id, current["user_id"], "admin")

    requested_member_ids = set(req.member_ids)
    for phone_number in req.member_phone_numbers:
        user = db.query(User).filter(User.phone_number == phone_number).first()
        if user:
            requested_member_ids.add(user.id)

    for member_id in requested_member_ids:
        user = db.query(User).filter(User.id == member_id).first()
        if user:
            add_group_member_once(db, group.id, user.id)

    db.commit()
    db.refresh(group)
    return {"group": serialize_group(group, db, include_members=True)}


@app.get("/groups/{group_id}")
def get_group(
    group_id: str,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current["user_id"],
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Group not found")

    group = db.query(Group).filter(Group.id == group_id).first()
    return {"group": serialize_group(group, db, include_members=True)}


@app.post("/groups/{group_id}/members", status_code=201)
def add_group_member(
    group_id: str,
    req: AddGroupMemberRequest,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    admin = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current["user_id"],
        GroupMember.role == "admin",
    ).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Only group admins can add members")

    user = None
    if req.member_id:
        user = db.query(User).filter(User.id == req.member_id).first()
    if not user and req.phone_number:
        user = db.query(User).filter(User.phone_number == req.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    add_group_member_once(db, group_id, user.id)
    db.commit()
    group = db.query(Group).filter(Group.id == group_id).first()
    return {"group": serialize_group(group, db, include_members=True)}


@app.delete("/groups/{group_id}/members/{member_id}")
def remove_group_member(
    group_id: str,
    member_id: str,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    admin = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current["user_id"],
        GroupMember.role == "admin",
    ).first()
    if not admin and member_id != current["user_id"]:
        raise HTTPException(status_code=403, detail="Only group admins can remove other members")

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == member_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"message": "Member removed successfully"}

@app.post("/media/upload", status_code=201)
async def upload_media(
    file: UploadFile = File(...),
    current=Depends(get_current_user)
):
    content_type = file.content_type or "application/octet-stream"
    if content_type.startswith("image/"):
        file_type = "IMG"
    elif content_type.startswith("video/"):
        file_type = "VID"
    elif content_type.startswith("audio/"):
        file_type = "AUD"
    elif content_type in [
        "application/pdf",
        "application/msword",
    ]:
        file_type = "DOC"
    else:
        file_type = "UNK"

    is_supported_media = content_type.startswith(ALLOWED_MEDIA_PREFIXES)
    is_supported_file = content_type in ALLOWED_FILE_TYPES
    if not is_supported_media and not is_supported_file:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    original_name = Path(file.filename or "attachment").name
    suffix = Path(original_name).suffix.lower()

    stored_name = f"{file_type}_{uuid.uuid4().hex}{suffix}"
    target_path = UPLOAD_DIR / stored_name

    total_size = 0
    with target_path.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:
                output.close()
                target_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File is larger than 25MB")
            output.write(chunk)

    return {
        "media_url": f"/uploads/{stored_name}",
        "msg_type": get_message_type(content_type),
        "filename": original_name,
        "content_type": content_type,
        "size": total_size,
    }

@app.get("/chats/{contact_id}/messages")
def get_user_chat_messages(
    contact_id: str,
    current=Depends(get_current_user),
    db=Depends(get_db),
    offset: int = 0, 
    limit: int = 20
):
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be 0 or greater")

    messages = (db.query(Message).filter(
            or_(
                (Message.sender_id == current["user_id"]) & (Message.receiver_id == contact_id),
                (Message.sender_id == contact_id) & (Message.receiver_id == current["user_id"]),
            )
        )
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"messages": [serialize_message(msg, current["user_id"]) for msg in messages]}
    

@app.post("/chats/{contact_id}/messages", status_code=201)
async def post_message(
    contact_id: str,
    req: Request,
    current=Depends(get_current_user),
    db=Depends(get_db)
):
    try:
        data = await req.json()
        receiver = db.query(User).filter(User.id == contact_id).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="Recipient not found")

        content = (data.get("content") or "").strip() or None
        media_url = data.get("media_url")
        msg_type = data.get("msg_type", "text")
        allowed_message_types = {item.value for item in MessageType}
        if msg_type not in allowed_message_types:
            raise HTTPException(status_code=400, detail="Unsupported message type")
        if msg_type == "text" and media_url:
            msg_type = get_message_type(data.get("content_type"))
        if not content and not media_url:
            raise HTTPException(status_code=400, detail="Message content or media is required")

        new_message = Message(
            sender_id=current["user_id"],
            receiver_id=contact_id,
            content=content,
            msg_type=MessageType(msg_type),
            media_url=media_url,
            status="sent"
        )
        db.add(new_message)
        add_chat_user(current["user_id"], contact_id, db)
        add_chat_user(contact_id, current["user_id"], db)

        db.commit()
        db.refresh(new_message)
        receiver_id = new_message.receiver_id
        message = serialize_message(new_message, current["user_id"])
        receiver_message = serialize_message(new_message, receiver_id)

        response = {"action": "new_message", "message": receiver_message}
        await manager.send_personal_message(response, receiver_id)

        return {"message": "Message sent successfully", "message_id": new_message.id, "chat_message": message}
    except Exception as e:
        db.rollback() # Important to rollback on DB errors
        raise HTTPException(status_code=500, detail= str(e))

@app.get("/check-user")
def check_user(phone: str, db: Session = Depends(get_db)):
    # print("Checking user existence for phone:", phone)
    # time.sleep(2)  # Simulate some processing delay
    user = db.query(User).filter(User.phone_number == phone).first()
    return {"exists": bool(user)}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, db: Session = Depends(get_db)):
    await manager.connect(user_id, websocket)
    print(f"WebSocket connected for user_id: {user_id}")  # Debugging line
    try:
        while True:
            # Receive data from the client (e.g., typing indicators)
            data = await websocket.receive_json()
            print("Received WebSocket data:", data)  # Debugging line to check incoming WebSocket data
            action = data.get("action")
            receiver_id = data.get("receiver_id")
            if action == "typing" and receiver_id:
                receiver_id = data['receiver_id']
                response = {
                    "action": "typing_status",
                    "sender_id": user_id,
                    "is_typing": data['is_typing']
                }
                await manager.send_personal_message(response, receiver_id)
            elif action in [
                "call_invite",
                "call_accept",
                "call_reject",
                "call_offer",
                "call_answer",
                "ice_candidate",
                "call_end",
            ] and receiver_id:
                delivered = await manager.send_personal_message({
                    **data,
                    "sender_id": user_id,
                }, receiver_id)
                if not delivered and action == "call_invite":
                    await manager.send_personal_message({
                        "action": "call_not_reachable",
                        "sender_id": user_id,
                        "receiver_id": receiver_id,
                        "contact_name": data.get("caller_name") or "Contact",
                    }, user_id)
            # Process data if needed
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user_id: {user_id}")  # Debugging line
        await manager.disconnect(user_id, db)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
