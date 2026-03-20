# uvicorn main:app --host 0.0.0.0 --port 8000 --reload

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from services.api_token_service import require_api_token_hash
from services.auth_service import oauth2_scheme

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

API_USERNAME = os.getenv("API_USERNAME")
API_PASSWORD = os.getenv("API_PASSWORD")

app = FastAPI(dependencies=[Depends(require_api_token_hash)])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "API running"}

@app.get("/health")
def health():
    return {"status": "ok"}

from routes import login, users

app.include_router(users.router)
app.include_router(login.router)