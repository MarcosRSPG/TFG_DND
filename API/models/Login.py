from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str | None = None
    username: str | None = None
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    isAdmin: bool
    user_id: str
    name: str
    email: str


class AuthUserPayload(BaseModel):
    user_id: str
    email: str
    username: str
    isAdmin: bool


class VerifyTokenResponse(BaseModel):
    valid: bool
    user: AuthUserPayload
