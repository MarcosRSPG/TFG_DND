import asyncio
import httpx
from typing import Any


class RemoteCatalogRepository:
    def __init__(
        self,
        *,
        base_url: str,
        list_endpoint: str,
        results_key: str = "results",
        index_field: str = "index",
        max_workers: int = 8,
        timeout_seconds: int = 30,
    ) -> None:
        self.base_url = base_url
        self.list_endpoint = list_endpoint
        self.results_key = results_key
        self.index_field = index_field
        self.max_workers = max_workers
        self.timeout_seconds = timeout_seconds
        self._catalog_cache: list[dict[str, Any]] | None = None

    def clear_cache(self) -> None:
        self._catalog_cache = None

    async def _fetch_single(self, client: httpx.AsyncClient, index: str) -> dict[str, Any] | None:
        try:
            response = await client.get(self.base_url + self.list_endpoint + "/" + index)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception:
            return None

    async def _fetch_catalog(self, page: int = 1, page_size: int = 20) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds, follow_redirects=True) as client:
                response = await client.get(
                    self.base_url + self.list_endpoint,
                    params={"page": page, "pageSize": page_size}
                )
                
                if response.status_code != 200:
                    return []

                try:
                    data = response.json()
                except Exception:
                    return []

                return data.get(self.results_key, [])

        except Exception as e:
            print(f"Error fetching catalog page {page}: {e}")
            return []

    async def _fetch_all(self) -> list[dict[str, Any]]:
        try:
            url = self.base_url + self.list_endpoint
            print(f"Fetching {url}...")
            
            # Deshabilitar verificación SSL para APIs con certificados inválidos
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds, 
                follow_redirects=True,
                verify=False
            ) as client:
                response = await client.get(url)
                
                if response.status_code != 200:
                    print(f"Error fetching {self.list_endpoint}: HTTP {response.status_code}")
                    return []

                data = response.json()
                print(f"Got data, keys: {list(data.keys())}")
                
                # Intentar distintos results_key
                summaries = data.get(self.results_key, [])
                if not summaries:
                    # Probar con otras keys comunes
                    for alt_key in ['results', 'data', 'spells', 'monsters']:
                        summaries = data.get(alt_key, [])
                        if summaries:
                            print(f"Found results with key '{alt_key}'")
                            break
                
                if not summaries:
                    print(f"No results found, data: {str(data)[:200]}")
                    return []

            print(f"Found {len(summaries)} summaries, fetching details...")

            indexes = [summary.get(self.index_field) for summary in summaries if summary.get(self.index_field)]
            
            if not indexes:
                return []

            docs = []
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds, 
                follow_redirects=True,
                verify=False
            ) as client:
                for batch_start in range(0, len(indexes), 20):
                    batch = indexes[batch_start:batch_start + 20]
                    tasks = [self._fetch_single(client, idx) for idx in batch]
                    responses = await asyncio.gather(*tasks, return_exceptions=True)

                    for resp in responses:
                        if isinstance(resp, dict) and resp and not resp.get("error"):
                            docs.append(resp)
                    
                    await asyncio.sleep(0.05)

            return docs

        except Exception as e:
            print(f"Error fetching catalog {self.list_endpoint}: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def get_catalog(self, page: int = 1, page_size: int = 20) -> list[dict[str, Any]]:
        # Always fetch full details (not just summary) to get size, type, challenge_rating, etc.
        if self._catalog_cache is not None:
            start = (page - 1) * page_size
            end = start + page_size
            return self._catalog_cache[start:end]

        self._catalog_cache = await self._fetch_all()
        
        start = (page - 1) * page_size
        end = start + page_size
        return self._catalog_cache[start:end]

    async def get_all(self) -> list[dict[str, Any]]:
        # Devuelve todos los elementos sin paginación
        if self._catalog_cache is not None:
            return self._catalog_cache

        self._catalog_cache = await self._fetch_all()
        return self._catalog_cache

    async def get_by_index(self, index: str) -> dict[str, Any] | None:
        for doc in await self.get_catalog(page_size=999999):
            if doc.get(self.index_field) == index:
                return doc
        return None