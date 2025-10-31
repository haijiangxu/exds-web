
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from webapp.tools.mongo import DATABASE as db
from webapp.tools.security import verify_password
from webapp.api import v1

# --- 安全与配置常量 ---
# !!! 警告: 在生产环境中，密钥应从环境变量或安全配置中加载，绝不能硬编码 !!!
SECRET_KEY = "a_very_secret_key_that_should_be_changed"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Pydantic 模型定义 ---
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

# --- 初始化 ---
# 定义一个函数，用于获取真实的客户端IP，以兼容反向代理
def get_real_ip(request: Request) -> str:
    if "x-forwarded-for" in request.headers:
        # X-Forwarded-For 可以是一个逗号分隔的IP列表，第一个通常是原始客户端IP
        return request.headers["x-forwarded-for"].split(',')[0].strip()
    return get_remote_address(request)

# 速率限制器
limiter = Limiter(key_func=get_real_ip, default_limits=["1000 per minute"])

# FastAPI 应用实例
app = FastAPI(
    title="电力交易辅助分析系统API",
    description="为前端提供数据接口服务",
    version="1.0.0",
)
# 将速率限制器添加到应用状态
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# OAuth2 密码模式
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- 中间件配置 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 数据库与认证函数 ---
def get_user(db, username: str):
    user = db.users.find_one({"username": username})
    if user:
        return UserInDB(**user)

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
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

# --- API 路由定义 ---
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

# 包含 v1 版本的路由
app.include_router(v1.public_router) # 公开路由，无需认证
app.include_router(v1.router, dependencies=[Depends(get_current_active_user)]) # 私有路由，需要认证

@app.get("/", tags=["Root"], summary="应用根路径")
def read_root():
    return {"message": "欢迎使用电力交易辅助分析系统API"}
