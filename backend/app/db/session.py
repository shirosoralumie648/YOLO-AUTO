from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL

# For SQLite, we need to add a special argument to allow multi-threaded access.
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
