import hmac
import hashlib
from fastapi import Header, HTTPException, status
from config import API_TOKEN

def require_api_token_hash(x_api_token: str | None = Header(default=None, alias="X-API-Token")) -> None:
    plain_token = API_TOKEN
    if not plain_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API_TOKEN no configurado en el entorno",
        )

    expected_hash = hashlib.sha256(plain_token.encode("utf-8")).hexdigest()

    if not x_api_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta header X-API-Token",
        )

    if not hmac.compare_digest(x_api_token, expected_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Token invalido",
        )
