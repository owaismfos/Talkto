# main.py or websocket_manager.py
import asyncio

from fastapi import WebSocket, Depends
from typing import Dict
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from .models import User

class ConnectionManager:
    def __init__(self):
        # Dictionary to map user_id to their active WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        self.broadcast_status = ''

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        await self.broadcast({
            "action": "presence_update",
            "user_id": user_id,
            "status": "online",
            "last_seen": "Online",
        })

    async def disconnect(self, user_id: str, db: Session):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            last_seen_time = self.update_last_seen(user_id, db)  # Update last seen time on disconnect
            message = {
                "action": "presence_update",
                "user_id": user_id,
                "status": "offline",
                "last_seen": last_seen_time.strftime("%I:%M %p") if last_seen_time else None
            }
            await self.broadcast(message)

    def get_socket(self, user_id: str) -> WebSocket:
        return self.active_connections.get(user_id)


    def update_last_seen(self, user_id: str, db: Session):
        # This method can be called to update the last seen time for a user
        now = datetime.now(timezone.utc)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        user.last_seen = now
        db.commit()
        return now

    async def send_personal_message(self, message: dict, user_id: str) -> bool:
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
            return True
        return False

    async def broadcast(self, message: dict):
    # Create a list of "tasks" for every connection
        tasks = [conn.send_json(message) for conn in self.active_connections.values()]
        # Run all tasks simultaneously
        await asyncio.gather(*tasks, return_exceptions=True)

# app = FastAPI()

# @app.websocket("/ws/{user_id}")
# async def websocket_endpoint(websocket: WebSocket, user_id: str):
#     await manager.connect(user_id, websocket)
#     try:
#         while True:
#             # Receive data from the client (e.g., typing indicators)
#             data = await websocket.receive_json()
#             # Process data if needed
#     except WebSocketDisconnect:
#         manager.disconnect(user_id)
