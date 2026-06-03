from pydantic import BaseModel, EmailStr


class UserRegisterRequest(BaseModel):
    email: str
    password: str


class UserLoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
