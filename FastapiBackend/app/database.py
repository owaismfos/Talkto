from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from pathlib import Path
import urllib.parse
import os

# Replace with your MySQL credentials
# DATABASE_URL = "mysql+pymysql://user:password@localhost/talkto_db"
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

DB_USER = os.getenv("DATABASE_USER")
DB_PASSWORD = urllib.parse.quote_plus(os.getenv("DATABASE_PASSWORD"))
DB_HOST = os.getenv("DATABASE_HOST")
DB_PORT = os.getenv("DATABASE_PORT")
DB_NAME = os.getenv("DATABASE_NAME")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
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
