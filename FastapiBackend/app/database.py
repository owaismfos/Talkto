from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from pathlib import Path
import urllib.parse
import os

# Replace with your MySQL credentials if you want to use a remote database.
# By default, this falls back to a local SQLite database so the app can run quickly.
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

DB_USER = os.getenv("DATABASE_USER")
DB_PASSWORD = urllib.parse.quote_plus(os.getenv("DATABASE_PASSWORD") or "")
DB_HOST = os.getenv("DATABASE_HOST")
DB_PORT = os.getenv("DATABASE_PORT")
DB_NAME = os.getenv("DATABASE_NAME")

if DB_USER and DB_HOST and DB_PORT and DB_NAME:
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(DATABASE_URL)
else:
    DATABASE_URL = "sqlite:///./talkto.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create the table in MySQL
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
