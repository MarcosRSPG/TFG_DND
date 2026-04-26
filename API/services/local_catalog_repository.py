from typing import Any
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE


class LocalCatalogRepository:
    """Reads catalog data from local MongoDB instead of remote API."""
    
    def __init__(
        self,
        collection_name: str,
        index_field: str = "index",
    ) -> None:
        self.collection_name = collection_name
        self.index_field = index_field
        self._client: AsyncIOMotorClient | None = None
        self._cache: list[dict[str, Any]] | None = None
    
    async def get_db(self):
        if self._client is None:
            self._client = AsyncIOMotorClient(MONGODB_URI)
        return self._client[MONGODB_DATABASE]
    
    def clear_cache(self) -> None:
        self._cache = None
    
    async def _fetch_all(self) -> list[dict[str, Any]]:
        db = await self.get_db()
        collection = db[self.collection_name]
        docs = await collection.find({}).to_list(length=None)
        return docs
    
    async def _fetch_all_no_id(self) -> list[dict[str, Any]]:
        """Fetch all documents but remove _id field"""
        db = await self.get_db()
        collection = db[self.collection_name]
        docs = await collection.find({}).to_list(length=None)
        # Remove MongoDB _id field from each document for JSON serialization
        result = []
        for doc in docs:
            if doc:
                doc_copy = {k: v for k, v in doc.items() if k != '_id'}
                result.append(doc_copy)
        return result
    
    async def get_catalog(self, page: int = 1, page_size: int = 20) -> list[dict[str, Any]]:
        if self._cache is not None:
            start = (page - 1) * page_size
            end = start + page_size
            return self._cache[start:end]
        
        self._cache = await self._fetch_all()
        
        start = (page - 1) * page_size
        end = start + page_size
        return self._cache[start:end]
    
    async def get_all(self) -> list[dict[str, Any]]:
        if self._cache is not None:
            return self._cache
        
        self._cache = await self._fetch_all()
        return self._cache
    
    async def get_all_with_id(self) -> list[dict[str, Any]]:
        """Get all documents with _id field included"""
        if self._cache is not None:
            return self._cache
        
        self._cache = await self._fetch_all()
        return self._cache
    
    async def get_by_index(self, index: str) -> dict[str, Any] | None:
        for doc in await self.get_catalog(page_size=999999):
            if doc and doc.get(self.index_field) == index:
                return doc
        return None
    
    async def get_by_id(self, doc_id: str) -> dict[str, Any] | None:
        """Get a document by its _id"""
        from bson import ObjectId
        try:
            obj_id = ObjectId(doc_id)
        except Exception:
            return None
        
        db = await self.get_db()
        collection = db[self.collection_name]
        doc = await collection.find_one({"_id": obj_id})
        
        if doc:
            # Return document with _id included (not removed)
            return doc
        return None


# Repository instances for each catalog type that now reads from local MongoDB
_local_classes = LocalCatalogRepository(collection_name="classes", index_field="index")
_local_subclasses = LocalCatalogRepository(collection_name="subclasses", index_field="index")
_local_races = LocalCatalogRepository(collection_name="races", index_field="index")
_local_subraces = LocalCatalogRepository(collection_name="subraces", index_field="index")


# Helper functions for routes
async def get_all(collection_name: str) -> list[dict[str, Any]]:
    """Get all documents from a collection"""
    repo = LocalCatalogRepository(collection_name=collection_name, index_field="index")
    return await repo.get_all()


async def get_by_index(collection_name: str, index: str) -> dict[str, Any] | None:
    """Get a document by its index field"""
    repo = LocalCatalogRepository(collection_name=collection_name, index_field="index")
    return await repo.get_by_index(index)


async def get_by_id(collection_name: str, doc_id: str) -> dict[str, Any] | None:
    """Get a document by its _id"""
    repo = LocalCatalogRepository(collection_name=collection_name, index_field="index")
    return await repo.get_by_id(doc_id)