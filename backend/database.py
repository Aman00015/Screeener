from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Render automatically sets DATABASE_URL when a Postgres DB is linked.
db_url = os.environ.get("DATABASE_URL", os.environ.get("POSTGRES_URL"))

if db_url:
    # SQLAlchemy 1.4+ requires "postgresql://" instead of "postgres://"
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = db_url
else:
    # Fallback to SQLite if no Postgres URL is provided, preventing crashes
    SQLALCHEMY_DATABASE_URL = "sqlite:///./screener.db"

# SQLite requires check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
