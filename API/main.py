# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# docker exec tfg_backend pkill -f debugpy; docker exec tfg_backend pkill -f uvicorn
# python -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 -m uvicorn main:app --host 0.0.0.0 --port 8000 --access-log --log-level debug
import hashlib
import hmac
import logging
import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

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
async def auth_middleware(request: Request, call_next):
    # Allow OPTIONS (CORS preflight) without auth
    if request.method == "OPTIONS":
        return await call_next(request)
    
    # Allow requests with Origin header (CORS) without token for data endpoints
    origin = request.headers.get("Origin") or request.headers.get("origin")
    if origin and request.url.path.startswith("/"):
        # Let it through for data endpoints, auth will be checked separately if needed
        pass
    
    # Also allow health and root endpoints without auth
    if request.url.path in ["/", "/health", "/docs", "/openapi.json", "/redoc"]:
        return await call_next(request)
    
    # Require API token for all other endpoints
    from config import API_TOKEN
    x_api_token = request.headers.get("X-API-Token")
    
    expected_hash = hashlib.sha256(API_TOKEN.encode("utf-8")).hexdigest()
    
    if not x_api_token or not hmac.compare_digest(x_api_token, expected_hash):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=401,
            content={"detail": "X-API-Token invalido o faltante"},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    return await call_next(request)

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

from routes import login, users, backgrounds, items, monsters, spells, characters, options, races, subraces, classes, traits, features

app.include_router(users.router)
app.include_router(login.router)
app.include_router(backgrounds.router)
app.include_router(items.router)
app.include_router(monsters.router)
app.include_router(spells.router)
app.include_router(characters.router)
app.include_router(options.router)
app.include_router(races.router)
app.include_router(subraces.router)
app.include_router(classes.router)
app.include_router(traits.router)
app.include_router(features.router)