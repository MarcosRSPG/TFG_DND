# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# docker exec tfg_backend pkill -f debugpy; docker exec tfg_backend pkill -f uvicorn
# python -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 -m uvicorn main:app --host 0.0.0.0 --port 8000 --access-log --log-level debug
import logging
import time
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from services.api_token_service import require_api_token_hash


app = FastAPI(dependencies=[Depends(require_api_token_hash)])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api.request")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def trace_http(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    start_time = time.perf_counter()
    logger.info(
        "REQ id=%s method=%s path=%s",
        request_id,
        request.method,
        request.url.path,
    )

    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "RES id=%s method=%s path=%s status=%s elapsed_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response

@app.on_event("startup")
async def startup():
    print("Starting API...")


@app.on_event("shutdown")
async def shutdown():
    from db import close_db
    await close_db()
    print("API shut down")


@app.get("/")
async def read_root():
    return {"message": "API running"}


@app.get("/health")
async def health():
    return {"status": "ok"}

from routes import login, users, backgrounds, items, monsters, spells, characters

app.include_router(users.router)
app.include_router(login.router)
app.include_router(backgrounds.router)
app.include_router(items.router)
app.include_router(monsters.router)
app.include_router(spells.router)
app.include_router(characters.router)