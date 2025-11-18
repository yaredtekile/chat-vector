import re
from typing import List

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.models import Conversation, DocumentChunk, Message
from app.services.embeddings import auth, get_embedding, client as llm_client

AMHARIC_PATTERN = re.compile(r"[\u1200-\u137F]")


def search_relevant_chunks(db: Session, conversation_id: int, query: str, top_k: int = 5) -> List[str]:
    embedding = get_embedding(query)
    sql = text(
        """
        SELECT chunk
        FROM document_chunks
        WHERE conversation_id = :conv_id
        ORDER BY embedding <-> (:emb)::vector
        LIMIT :limit
        """
    )
    result = db.execute(sql, {"conv_id": conversation_id, "emb": embedding, "limit": top_k})
    return [row[0] for row in result.fetchall()]


def is_amharic(text: str) -> bool:
    return bool(AMHARIC_PATTERN.search(text))


def build_prompt(history: List[Message], context_chunks: List[str], user_message: str) -> str:
    recent_history = history[-10:]
    context = "\n\n".join(context_chunks)
    target_language_instruction = (
        "Respond in Amharic. " if is_amharic(user_message) else "Respond in the user's language. "
    )

    conversation_lines = []
    for msg in recent_history:
        role = "User" if msg.role == "user" else "Assistant"
        conversation_lines.append(f"{role}: {msg.content}")

    prompt = f"""
You are a helpful assistant that answers based on the provided document context. {target_language_instruction}If the answer is not present in the context, say you are not sure.

CONTEXT:
{context}

CONVERSATION HISTORY:
{'\n'.join(conversation_lines)}

USER: {user_message}
"""
    return prompt.strip()


def chat_with_rag(db: Session, conversation_id: int | None, user_message: str) -> tuple[str, int]:
    convo: Conversation | None = None
    if conversation_id is not None:
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()

    if convo is None:
        convo = Conversation(title="New Conversation")
        db.add(convo)
        db.commit()
        db.refresh(convo)

    user_msg = Message(conversation_id=convo.id, role="user", content=user_message)
    db.add(user_msg)
    db.commit()

    history = (
        db.query(Message)
        .filter(Message.conversation_id == convo.id)
        .order_by(Message.created_at.asc(), Message.id.asc())
        .all()
    )

    context_chunks = search_relevant_chunks(db, convo.id, user_message)
    prompt = build_prompt(history, context_chunks, user_message)

    response = llm_client.chat.completions.create(
        model=auth.deepseek_model,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = response.choices[0].message.content or ""

    assistant_msg = Message(conversation_id=convo.id, role="assistant", content=answer)
    db.add(assistant_msg)
    db.commit()

    return answer, convo.id
