import fastapi
from fastapi import Depends
from fastapi.security import OAuth2PasswordRequestForm
from models.Login import LoginRequest, LoginResponse
from services.login_service import authenticate_login, authenticate_login_form, logout_service

router = fastapi.APIRouter()

@router.post('/api/login', response_model=LoginResponse)
def login(request: LoginRequest):
    return authenticate_login(request)

@router.post('/api/token', response_model=LoginResponse)
def login_token(form_data: OAuth2PasswordRequestForm = Depends()):
    return authenticate_login_form(form_data)

@router.post('/api/logout')
def logout():
    return logout_service()
