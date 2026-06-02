import asyncio
import logging
import httpx as httpx_lib
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, GoogleAuthRequest, UserOut, Token
from ..auth import get_password_hash, verify_password, create_access_token, get_current_user
from ..config import env
from ..services.kirim_email import subscribe as kirim_subscribe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", "")


async def _subscribe_background(email: str, name: str = ""):
    """Fire-and-forget kirim.email subscription."""
    try:
        await kirim_subscribe(email, name)
    except Exception as e:
        logger.error(f"Background kirim.email subscribe failed for {email}: {e}")


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        auth_provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    # Subscribe to kirim.email in background
    background_tasks.add_task(_subscribe_background, user.email, user.name or "")
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user.id)})
    # Subscribe to kirim.email in background
    background_tasks.add_task(_subscribe_background, user.email, user.name or "")
    return {"access_token": token, "token_type": "bearer"}


@router.post("/google", response_model=Token)
async def google_auth(req: GoogleAuthRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Authenticate or register user via Google ID token.
    Frontend sends the id_token obtained from Google Identity Services.
    Backend verifies it with Google and creates/retrieves the user.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured on server")

    # Verify the Google ID token
    try:
        async with httpx_lib.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={req.id_token}"
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")

            token_info = resp.json()

            # Verify the token was issued for our app
            if token_info.get("aud") != GOOGLE_CLIENT_ID:
                raise HTTPException(status_code=401, detail="Google token audience mismatch")

            email = token_info.get("email")
            name = token_info.get("name", "")
            if not email:
                raise HTTPException(status_code=401, detail="Email not found in Google token")

            # Only allow verified emails
            if token_info.get("email_verified") not in ("true", True):
                raise HTTPException(status_code=401, detail="Google email not verified")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to verify Google token")

    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create new user from Google account
        user = User(
            email=email,
            name=name,
            password_hash=get_password_hash(f"google-oauth-{email}"),  # random unused password
            auth_provider="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name and auth_provider if user registered with local before
        if not user.name and name:
            user.name = name
        if user.auth_provider == "local":
            user.auth_provider = "google"
        db.commit()

    token = create_access_token({"sub": str(user.id)})

    # Subscribe to kirim.email in background
    background_tasks.add_task(_subscribe_background, email, name)

    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
