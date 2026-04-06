# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# python -m debugpy --listen 0.0.0.0:5678 --wait-for-client -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.api_token_service import require_api_token_hash


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

from routes import login, users, backgrounds, items, monsters, spells, characters

app.include_router(users.router)
app.include_router(login.router)
app.include_router(backgrounds.router)
app.include_router(items.router)
app.include_router(monsters.router)
app.include_router(spells.router)
app.include_router(characters.router)