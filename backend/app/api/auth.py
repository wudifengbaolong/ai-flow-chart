from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.deps import DB

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(request: UserRegisterRequest, db: DB):
    # 检查邮箱是否已注册
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={
            "error": "EMAIL_EXISTS",
            "message": "该邮箱已注册",
            "detail": {},
        })

    # 创建用户
    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserResponse(id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest, db: DB):
    # 查找用户
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail={
            "error": "INVALID_CREDENTIALS",
            "message": "邮箱或密码错误",
            "detail": {},
        })

    # 生成 token
    token = create_access_token(user.id)

    return TokenResponse(access_token=token)
