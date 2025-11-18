def chunk_text(text: str, max_chars: int = 2000) -> list[str]:
    """Split text into chunks based on paragraphs, respecting max_chars."""
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks: list[str] = []
    current_chunk: list[str] = []
    current_len = 0

    for para in paragraphs:
        if current_len + len(para) + 1 > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_len = 0

        current_chunk.append(para)
        current_len += len(para) + 1  # account for newline

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks
