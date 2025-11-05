import re
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

# This is a relative import, assuming the mongo tool is in the same 'tools' directory
from .mongo import DATABASE as db

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a password."""
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> (bool, str): # type: ignore
    """
    Validates the password strength.
    Returns a tuple (is_valid, message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    
    checks = {
        "uppercase": re.search(r"[A-Z]", password),
        "lowercase": re.search(r"[a-z]", password),
        "digit": re.search(r"\d", password),
        "special": re.search(r"[!@#$%^&*]", password),
    }
    
    met_criteria_count = sum(1 for check in checks.values() if check)
    
    if met_criteria_count < 3:
        return False, "Password must contain at least three of the following: uppercase letter, lowercase letter, digit, special character."
        
    return True, "Password is valid."

# --- Security & Config Constants (Moved from main.py) ---
SECRET_KEY = "a_very_secret_key_that_should_be_changed"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Pydantic Models (Moved from main.py) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    is_active: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

# --- OAuth2 Scheme (Moved from main.py) ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Database & Auth Functions (Moved from main.py) ---
def get_user(db_session, username: str):
    user = db_session.users.find_one({"username": username})
    if user:
        return UserInDB(**user)

def authenticate_user(db_session, username: str, password: str):
    user = get_user(db_session, username)
    if not user or not user.is_active:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = get_user(db, username=token_data.username)
    
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user