from datetime import datetime, timezone
from pathlib import Path
import uuid

from app.database import get_db
from .helper import *
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from sqlalchemy.orm import Session
from collections import defaultdict
from .models import Chat, Contact, User, UserSession, Message
from .socket_manager import ConnectionManager
import time

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
        # time.sleep(5)  # Simulate processing delay (for testing)
        # 1. Search for user
        print("Attempting login for phone number:", request.phone_number)  # Debugging line
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
        .order_by(Contact.nickname)
        .all()
    )
    return {"contacts": [
        {
            "id": c.contact_id,
            "nickname": c.nickname,
            "added_at": c.added_at
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
    user = db.query(User).filter(User.phone_number == data['contact_number']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    contract = db.query(Contact).filter(
        Contact.owner_id == current["user_id"],
        Contact.contact_id == user.id
    ).first()
    if not contract:
        contract = Contact(
            owner_id=current["user_id"],
            contact_id=user.id,
            nickname=data['nickname']
        )
        db.add(contract)
        db.commit()
    return {"message": "Contract added successfully"}
    
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
    chats = db.query(Chat).filter(Chat.owner_id == current["user_id"]).all()
    users = []
    for chat in chats:
        contact = db.query(Contact).filter(
            Contact.owner_id == current["user_id"],
            Contact.contact_id == chat.chat_user_id
        ).first()
        user = db.query(User).filter(User.id == chat.chat_user_id).first()
        last_message = db.query(Message).filter(
            (
                (Message.sender_id == current["user_id"]) &
                (Message.receiver_id == chat.chat_user_id)
            ) |
            (
                (Message.sender_id == chat.chat_user_id) &
                (Message.receiver_id == current["user_id"])
            )
        ).order_by(Message.created_at.desc()).first()
        users.append({
            "id": chat.chat_user_id,
            "name": chat.nickname if contact else user.phone_number if user else "Unknown",
            "status": "Available",  # Placeholder, you can enhance this to show actual status
            "last_message": get_message_preview(last_message),
            "last_message_time": format_date_time(last_message.created_at) if last_message else None
        })

    return {"users": users}

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
    # This is a placeholder function. You would implement the logic to fetch chat messages between the current user and the specified contact.
    messages = (db.query(Message).filter(
            ((Message.sender_id == current["user_id"]) & (Message.receiver_id == contact_id)) |
            ((Message.sender_id == contact_id) & (Message.receiver_id == current["user_id"]))
        )
        .order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    # grouped_messages = defaultdict(list)
    sorted_grouped_messages = []
    for msg in messages:
        date_key = msg.created_at.date()
        # date_key = format_date(msg.created_at.date())
        formatted_time = msg.created_at.strftime("%I:%M %p")
        # grouped_messages[date_key].append({
        sorted_grouped_messages.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "msg_type": msg.msg_type,
            "media_url": msg.media_url,
            "status": msg.status,
            "created_at": msg.created_at.isoformat() + 'Z',
            "formatted_time": formatted_time,
            "read_at": msg.read_at,
            "sender": "me" if msg.sender_id == current["user_id"] else "them"
        })

    # sorted_keys = sorted(grouped_messages.keys(), reverse=True)
    # sorted_grouped_messages = []
    # for key in sorted_keys:
    #     formated_key = format_date(key)
    #     sorted_grouped_messages.append({
    #         str(formated_key): grouped_messages[key]
    #     })

    return {"messages": sorted_grouped_messages}
    

@app.post("/chats/{contact_id}/messages", status_code=201)
async def post_message(
    contact_id: str,
    req: Request,
    current=Depends(get_current_user),
    db=Depends(get_db)
):
    data = await req.json()
    content = data.get("content")
    media_url = data.get("media_url")
    msg_type = data.get("msg_type", "text")
    if not content and not media_url:
        raise HTTPException(status_code=400, detail="Message content or media is required")

    new_message = Message(
        sender_id=current["user_id"],
        receiver_id=contact_id,
        content=content,
        msg_type=msg_type,
        media_url=media_url,
        status="sent"
    )
    db.add(new_message)
    add_chat_user(current["user_id"], contact_id, db)
    add_chat_user(contact_id, current["user_id"], db)

    db.commit()
    db.refresh(new_message)
    # print(model_to_dict(new_message))
    formatted_time = new_message.created_at.strftime("%I:%M %p")
    receiver_id = new_message.receiver_id
    message = {
        "id": new_message.id,
        "sender_id": new_message.sender_id,
        "receiver_id": new_message.receiver_id,
        "content": new_message.content,
        "msg_type": new_message.msg_type,
        "media_url": new_message.media_url,
        "status": new_message.status,
        "created_at": new_message.created_at,
        "formatted_time": formatted_time,
        "read_at": new_message.read_at,
        "sender": "me" if new_message.sender_id == current["user_id"] else "them"
    }
    if isinstance(message.get("created_at"), datetime):
        message["created_at"] = message["created_at"].isoformat()

    response = {"action": "new_message", "message": message}
    await manager.send_personal_message(response, receiver_id)

    return {"message": "Message sent successfully", "message_id": new_message.id, "chat_message": message}

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
                await manager.send_personal_message({
                    **data,
                    "sender_id": user_id,
                }, receiver_id)
            # Process data if needed
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user_id: {user_id}")  # Debugging line
        await manager.disconnect(user_id, db)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
