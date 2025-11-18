from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pypdf import PdfReader

from app.db.session import get_db
from app.models.models import Conversation, DocumentChunk
from app.services.chunking import chunk_text
from app.services.embeddings import get_embedding

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    conversation_id: int | None = Form(None),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    if file.content_type not in {"application/pdf", "application/x-pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    reader = PdfReader(file.file)
    full_text = "\n".join(page.extract_text() or "" for page in reader.pages)

    convo: Conversation | None = None
    if conversation_id is not None:
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()

    if convo is None:
        convo = Conversation(title=file.filename)
        db.add(convo)
        db.commit()
        db.refresh(convo)

    chunks = chunk_text(full_text)
    for chunk in chunks:
        embedding = get_embedding(chunk)
        doc_chunk = DocumentChunk(
            conversation_id=convo.id,
            chunk=chunk,
            embedding=embedding,
        )
        db.add(doc_chunk)

    db.commit()

    return {"conversation_id": convo.id, "num_chunks": len(chunks)}
