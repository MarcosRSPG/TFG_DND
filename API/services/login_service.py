from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt

from models.Login import LoginRequest, LoginResponse
from services import users_service
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

def _verify_password(plain_password: str, stored_password: str | None) -> bool:
    if not stored_password:
        return False

    if stored_password.startswith("$2"):
        return bcrypt.checkpw(plain_password.encode("utf-8"), stored_password.encode("utf-8"))

    # Fallback for seeded/plain legacy records.
    return plain_password == stored_password


def _create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _build_login_response(user, token: str) -> LoginResponse:
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        isAdmin=user.role == "admin",
        user_id=user.id,
        name=user.username,
        email=user.email,
    )


def authenticate_login(request: LoginRequest) -> LoginResponse:
    identifier = request.email or request.username
    if not identifier:
        raise HTTPException(status_code=400, detail="Debes enviar email o username")

    user = users_service.get_user_by_login(identifier, include_password=True)
    if not user or not _verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    token = _create_access_token(
        {
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
            "isAdmin": user.role == "admin",
        }
    )
    return _build_login_response(user, token)


def authenticate_login_form(form_data: OAuth2PasswordRequestForm) -> LoginResponse:
    user = users_service.get_user_by_login(form_data.username, include_password=True)
    if not user or not _verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    token = _create_access_token(
        {
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
            "isAdmin": user.role == "admin",
        }
    )
    return _build_login_response(user, token)


def logout_service() -> dict:
    return {"message": "Logout correcto"}
