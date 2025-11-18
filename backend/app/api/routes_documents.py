import io
from typing import Any
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pypdf import PdfReader
from pdf2image import convert_from_bytes
import pytesseract
from pytesseract.pytesseract import TesseractNotFoundError, TesseractError

from app.db.session import get_db
from app.models.models import Conversation, DocumentChunk
from app.services.chunking import chunk_text
from app.services.embeddings import get_embedding

router = APIRouter(prefix="/documents", tags=["documents"])

OCR_ENABLED = os.getenv("ENABLE_OCR", "true").lower() == "true"
TESSERACT_LANGS = os.getenv("TESSERACT_LANGS", "amh+eng")


def extract_text_with_ocr_fallback(pdf_bytes: bytes) -> tuple[str, dict[str, Any]]:
    """Extract text from the PDF; if no text is found, fall back to OCR and return metadata."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = list(reader.pages)
    extracted_text = "\n".join(page.extract_text() or "" for page in pages)

    if extracted_text.strip():
        return extracted_text, {
            "ocr_used": False,
            "pages_processed": len(pages),
            "text_source": "pdf_text",
        }

    if not OCR_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="No extractable text found and OCR is disabled. Enable OCR to process scanned PDFs.",
        )

    try:
        images = convert_from_bytes(pdf_bytes)
    except Exception as exc:  # pragma: no cover - safety net for rendering issues
        raise HTTPException(status_code=500, detail="Failed to render PDF for OCR.") from exc

    try:
        ocr_text = "\n".join(
            pytesseract.image_to_string(image, lang=TESSERACT_LANGS) for image in images
        ).strip()
    except TesseractNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail="OCR dependency missing: install the Tesseract binary on the server.",
        ) from exc
    except TesseractError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OCR failed. Ensure language data '{TESSERACT_LANGS}' is installed.",
        ) from exc
    if not ocr_text:
        raise HTTPException(status_code=400, detail="Unable to extract text from PDF.")

    return ocr_text, {
        "ocr_used": True,
        "pages_processed": len(images),
        "text_source": "ocr",
    }


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    conversation_id: int | None = Form(None),
    db: Session = Depends(get_db),
) -> dict[str, int | bool | str]:
    if file.content_type not in {"application/pdf", "application/x-pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    pdf_bytes = file.file.read()
    full_text, text_meta = extract_text_with_ocr_fallback(pdf_bytes)

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

    return {
        "conversation_id": convo.id,
        "num_chunks": len(chunks),
        "ocr_used": text_meta["ocr_used"],
        "pages_processed": text_meta["pages_processed"],
        "text_source": text_meta["text_source"],
    }
