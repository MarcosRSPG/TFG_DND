import fastapi
from fastapi import Depends, HTTPException, status
from dotenv import load_dotenv
from services import users_service
from main import oauth2_scheme
from jose import jwt, JWTError
from models.User import UserSchema
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

router = fastapi.APIRouter()

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("email"):
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return payload

@router.get("/api/users")
def get_users() -> list[UserSchema]:
    return users_service.get_all_users()

@router.get("/api/users/{id}")
def get_user(id: str) -> UserSchema:
    return users_service.get_user_by_id(id)

@router.post("/api/users")
def create_user(user: UserSchema, current_user: dict = Depends(get_current_user)) -> UserSchema:
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador.")
    return users_service.create_user(user)

@router.put("/api/users/{id}")
def update_user(id: str, user: UserSchema, current_user: dict = Depends(get_current_user)) -> UserSchema:
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador.")
    return users_service.update_user(id, user)

@router.delete("/api/users/{id}")
def delete_user(id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador.")
    return users_service.delete_user(id)
