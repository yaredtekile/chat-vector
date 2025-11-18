from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Conversation, Message
from app.services.rag_chat import chat_with_rag

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    conversation_id: int | None = None
    message: str


class ChatResponse(BaseModel):
    conversation_id: int
    answer: str


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    answer, convo_id = chat_with_rag(db, request.conversation_id, request.message)
    return ChatResponse(conversation_id=convo_id, answer=answer)


@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db)) -> List[dict]:
    conversations = db.query(Conversation).all()
    return [{"id": c.id, "title": c.title} for c in conversations]


@router.get("/conversations/{conversation_id}/messages")
def list_messages(conversation_id: int, db: Session = Depends(get_db)) -> List[dict]:
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc(), Message.id.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at,
        }
        for m in messages
    ]
