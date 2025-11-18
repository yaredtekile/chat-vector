from sqlalchemy import inspect, text

from app.db.session import Base, engine
# Import all models so they're registered with Base.metadata
from app.models.models import Conversation, DocumentChunk, Message  # noqa: F401


def init_db() -> None:
    print("Initializing database...")
    
    # Enable pgvector extension
    with engine.connect() as conn:
        print("Enabling pgvector extension...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
        print("✓ pgvector extension enabled")
    
    # Create all tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")
    
    # Verify tables exist
    print("Verifying tables...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    expected_tables = ["conversations", "messages", "document_chunks"]
    
    for table in expected_tables:
        if table in tables:
            print(f"  ✓ {table}")
        else:
            print(f"  ✗ {table} (missing)")
    
    if all(t in tables for t in expected_tables):
        print("\n✓ All tables created successfully!")
    else:
        print("\n⚠ Some tables are missing. Please check the database connection.")


if __name__ == "__main__":
    init_db()
