import re
from passlib.context import CryptContext

# Setup the password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a password."""
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> (bool, str):
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
