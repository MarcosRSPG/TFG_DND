from fastapi import Depends, HTTPException, status, Header
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM
from services.auth_service import get_current_user


def require_write_authorization(authorization: str | None = Header(None)):
    """
    Requiere un Authorization header válido con Bearer token (access token del login).
    Usado para POST, PUT, DELETE.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta header Authorization",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header inválido. Formato: 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Access token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("user_id"):
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    return payload
