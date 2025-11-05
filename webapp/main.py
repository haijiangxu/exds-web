from datetime import timedelta

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from webapp.tools.mongo import DATABASE as db
from webapp.api import v1, v1_retail_packages

# Import security functions and models from the new security tool
from webapp.tools.security import (
    Token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_active_user,
)

# --- Initialization ---

def get_real_ip(request: Request) -> str:
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(',')[0].strip()
    return get_remote_address(request)

limiter = Limiter(key_func=get_real_ip, default_limits=["1000 per minute"])

app = FastAPI(
    title="电力交易辅助分析系统API",
    description="为前端提供数据接口服务",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routes ---

@app.post("/token", response_model=Token, tags=["Authentication"])
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Include v1 routers
app.include_router(v1.public_router)
app.include_router(v1.router, dependencies=[Depends(get_current_active_user)])
app.include_router(v1_retail_packages.router, dependencies=[Depends(get_current_active_user)])

@app.get("/", tags=["Root"], summary="应用根路径")
def read_root():
    return {"message": "欢迎使用电力交易辅助分析系统API"}
