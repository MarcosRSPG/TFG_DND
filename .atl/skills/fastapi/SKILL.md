---
name: fastapi
description: >
  FastAPI development patterns following project conventions.
  Trigger: When writing Python/FastAPI code, routes, services, or models.
license: Apache-2.0
metadata:
  author: luis
  version: "1.0"
---

## When to Use

- Creating new routes in `routes/`
- Creating new services in `services/`
- Creating new models in `models/`
- Setting up FastAPI app
- Any Python/FastAPI-related code

## Critical Patterns

### File Structure

```
API/
├── main.py               # FastAPI app entry point
├── config.py             # Configuration
├── routes/
│   └── nome.py          # APIRouter
├── services/
│   └── nome_service.py # Business logic
└── models/
    └── Nome.py         # Pydantic models
```

### Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Routes | `nome.py` | `monsters.py`, `login.py` |
| Services | `nome_service.py` | `monsters_service.py`, `login_service.py` |
| Models | `PascalCase.py` | `Monster.py`, `User.py` |
| Functions | `snake_case` | `get_monster`, `authenticate_login` |

### Async Everything

All database I/O must be async:

```python
# BAD (sync)
def get_monster(monster_id: str) -> dict:
    return monsters_repository.find_one(monster_id)

# GOOD (async)
async def get_monster(monster_id: str) -> dict:
    return await monsters_repository.find_one(monster_id)
```

### Use Motor for MongoDB

```python
from motor.motor_asyncio import AsyncIOMotorClient

class MonstersRepository:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.client[MONGODB_DATABASE]
        self.collection = self.db[MONGODB_COLLECTION_MONSTERS]

    async def get_all(self) -> list[dict]:
        cursor = self.collection.find({})
        return await cursor.to_list(length=None)
```

### Use Pydantic for Models

```python
from pydantic import BaseModel, ConfigDict, Field

class Monster(BaseModel):
    index: str
    name: str
    size: str
    type: str
    hit_points: int
    challenge_rating: float

    model_config = ConfigDict(extra="allow")
```

### No Verbose Comments

```python
# BAD
# This function gets all monsters from the database
def get_all() -> list:
    """Get all monsters"""
    ...

# GOOD
def get_all() -> list:
    ...
```

## Route Template

```python
from fastapi import APIRouter, HTTPException, Body, Depends
from services.nome_service import nome_service

router = APIRouter(prefix="/nome", tags=["nome"])


@router.get("/")
async def get_all() -> list:
    return await nome_service.get_all()


@router.get("/{nome_id}")
async def get_one(nome_id: str) -> dict:
    result = await nome_service.get_by_id(nome_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Nome '{nome_id}' not found")
    return result
```

## Service Template

```python
from services.nome_repository import NomeRepository
from models.Nome import Nome

class NomeService:
    def __init__(self):
        self.repository = NomeRepository()

    async def get_all(self) -> list:
        return await self.repository.find_all()

    async def get_by_id(self, nome_id: str) -> dict:
        return await self.repository.find_by_id(nome_id)

    async def create(self, nome: dict) -> dict:
        validated = Nome.model_validate(nome)
        return await self.repository.insert_one(validated.model_dump())
```

## Repository Template

```python
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_DATABASE, MONGODB_COLLECTION_NOMES


class NomeRepository:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.client[MONGODB_DATABASE]
        self.collection = self.db[MONGODB_COLLECTION_NOMES]

    async def find_all(self) -> list[dict]:
        cursor = self.collection.find({})
        return await cursor.to_list(length=None)

    async def find_by_id(self, nome_id: str) -> dict | None:
        return await self.collection.find_one({"_id": nome_id})

    async def insert_one(self, doc: dict) -> dict:
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc
```

## Commands

```bash
# Run API
cd API
uvicorn main:app --reload

# Run with debug
python -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Important Rules

1. **ALWAYS ask before applying changes** — no silent modifications
2. **All database I/O must be async** — use motor, never sync calls
3. **Use Pydantic for validation** — all models inherit from BaseModel
4. **No verbose comments** — code should be self-explanatory
5. **Code should be clean, clear, and useful**
6. **Separate concerns**: routes → services → repositories → models