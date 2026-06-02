import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import User, Base

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_user(email: str, password: str):
    db = SessionLocal()
    try:
        # Check if user exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User {email} already exists!")
            return
        
        # Create user
        user = User(
            email=email,
            password_hash=hash_password(password),
            role="admin"
        )
        db.add(user)
        db.commit()
        print(f"User created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Default credentials
    email = "admin@papier.app"
    password = "admin123"
    
    print("Creating default admin user...")
    create_user(email, password)
