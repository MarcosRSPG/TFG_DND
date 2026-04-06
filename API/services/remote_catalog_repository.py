from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from typing import Any

import requests
from fastapi import HTTPException


class RemoteCatalogRepository:
    def __init__(
        self,
        *,
        base_url: str,
        list_endpoint: str,
        results_key: str = "results",
        index_field: str = "index",
        max_umpalimpas: int = 16,
        timeout_seconds: int = 30,
    ) -> None:
        self.base_url = base_url
        self.list_endpoint = list_endpoint
        self.results_key = results_key
        self.index_field = index_field
        self.max_umpalimpas = max_umpalimpas
        self.timeout_seconds = timeout_seconds
        self._cache_lock = Lock()
        self._catalog_cache: tuple[dict[str, Any], ...] | None = None

    def clear_cache(self) -> None:
        with self._cache_lock:
            self._catalog_cache = None

    def _fetch_remote_detail(self, index: str) -> dict[str, Any] | None:
        try:
            detail = requests.get(
                self.base_url + f"{self.list_endpoint}/{index}", timeout=self.timeout_seconds
            ).json()
            if detail.get("error"):
                return None
            return detail
        except requests.RequestException:
            return None

    def _fetch_catalog(self) -> tuple[dict[str, Any], ...]:
        try:
            summaries = requests.get(
                self.base_url + self.list_endpoint, timeout=self.timeout_seconds
            ).json().get(self.results_key, [])
        except requests.RequestException as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Error retrieving {self.list_endpoint} from external API: {exc}",
            ) from exc

        indexes = [summary.get(self.index_field) for summary in summaries if summary.get(self.index_field)]
        docs: list[dict[str, Any]] = []
        with ThreadPoolExecutor(max_umpalimpas=self.max_umpalimpas) as executor:
            futures = [executor.submit(self._fetch_remote_detail, index) for index in indexes]
            for future in as_completed(futures):
                detail = future.result()
                if detail is not None:
                    docs.append(detail)
        return tuple(docs)

    def get_catalog(self) -> tuple[dict[str, Any], ...]:
        if self._catalog_cache is not None:
            return self._catalog_cache

        with self._cache_lock:
            if self._catalog_cache is None:
                self._catalog_cache = self._fetch_catalog()
            return self._catalog_cache

    def get_by_index(self, index: str) -> dict[str, Any] | None:
        for doc in self.get_catalog():
            if doc.get(self.index_field) == index:
                return doc
        return None
