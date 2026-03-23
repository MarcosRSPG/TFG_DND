import fastapi
from fastapi import Depends
from fastapi.security import OAuth2PasswordRequestForm
from services.auth_service import get_current_user
from models.Login import LoginRequest, LoginResponse
from services.login_service import authenticate_login, authenticate_login_form, logout_service

router = fastapi.APIRouter(prefix="/auth", tags=["auth"])

@router.post('/login', response_model=LoginResponse)
def login(request: LoginRequest):
    return authenticate_login(request)

@router.post('/token', response_model=LoginResponse)
def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    return authenticate_login_form(form_data)

@router.post('/logout')
def logout(current_user: dict = Depends(get_current_user)):
    return logout_service()
