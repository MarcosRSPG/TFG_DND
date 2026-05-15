"""
10_mongo_search.py — Consulta la API REST de la app DnD (NO MongoDB directo).

ESTA CLASE YA NO USA MONGODB DIRECTAMENTE.
Llama a los mismos endpoints que usan los services de Angular:

  Angular ItemsService    → GET /items, GET /items/{id}
  Angular MonstersService → GET /monsters/
  Angular SpellsService   → GET /spells/

La API_URL es la misma que en APP/src/environments/environment.ts:
  http://localhost:8000

Uso:
  # Como script:
  python scripts/10_mongo_search.py

  # Como import:
  from scripts.api_search import ApiSearch  # nombre legacy: mongo_search
  api = ApiSearch()
  items = api.search_items("espada larga")
"""

import requests
import json

# ============================================================
# CONFIGURACIÓN — misma URL y token que la app Angular
# ============================================================
API_URL = "http://localhost:8000"
API_TOKEN = "tokenguay"


class ApiSearch:
    """
    Buscador en la API REST de la aplicación DnD.

    Se conecta a los mismos endpoints que los services de Angular:
      - ItemsService  → items/
      - MonstersService → monsters/
      - SpellsService → spells/

    NO requiere MongoDB directamente. Todo pasa por la API.

    Ejemplo:
        api = ApiSearch()
        espada = api.find_by_name("Longsword")
        armas = api.search_weapons("espada larga")
    """

    def __init__(self):
        self.api_url = API_URL
        self.headers = {
            "X-API-Token": API_TOKEN,
            "Content-Type": "application/json",
        }
        print(f"🔗 Conectando a API: {self.api_url}")
        print(f"   Endpoints: items, monsters, spells")

    def _get(self, endpoint: str, params: dict | None = None) -> list | dict | None:
        """GET a la API con manejo de errores."""
        try:
            response = requests.get(
                f"{self.api_url}{endpoint}",
                headers=self.headers,
                params=params,
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            print(f"   ⚠️  No se pudo conectar a la API en {self.api_url}")
            print(f"   Asegurate de que el backend esté corriendo.")
            return None
        except requests.exceptions.HTTPError as e:
            print(f"   ⚠️  Error HTTP {e.response.status_code} en {endpoint}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"   ⚠️  Error en API {endpoint}: {e}")
            return None

    # ================================================================
    # ITEMS — mismo contrato que ItemsService de Angular
    # ================================================================

    def find_by_name(self, name: str, item_type: str | None = None) -> dict | None:
        """
        Busca un item por nombre.
        Equivalente a: ItemsService.getItems().find(i => i.name.includes(name))

        Args:
            name: Nombre o parte del nombre
            item_type: Filtrar por tipo (weapon, armor, magicitem, etc.)

        Returns:
            Diccionario con el primer item que matchea, o None
        """
        all_items = self._get("/items", params={"limit": 50})

        if not isinstance(all_items, list):
            return None

        name_lower = name.lower()

        for item in all_items:
            if name_lower in item.get("name", "").lower():
                if item_type:
                    item_api_type = self._infer_type(item)
                    if item_api_type != item_type:
                        continue

                # Obtener detalle completo
                item_id = item.get("id") or item.get("index")
                if item_id:
                    detail = self._get(f"/items/{item_id}")
                    if detail:
                        return detail

                return item

        return None

    def search_items(self, text: str, item_type: str | None = None, limit: int = 5) -> list[dict]:
        """
        Busca items por texto en la API.
        Equivalente a: ItemsService.getItems() + filtrado local.

        Args:
            text: Texto a buscar en nombre o descripción
            item_type: Filtrar por tipo (weapon, armor, magicitem, etc.)
            limit: Máximo de resultados

        Returns:
            Lista de items que matchean
        """
        all_items = self._get("/items", params={"limit": 100})

        if not isinstance(all_items, list):
            return []

        name_lower = text.lower()
        results = []

        for item in all_items:
            # Buscar en nombre
            if name_lower in item.get("name", "").lower():
                pass  # matchea por nombre
            elif name_lower in str(item.get("desc", "")).lower():
                pass  # matchea por descripción
            else:
                continue  # no matchea

            # Filtrar por tipo si se especificó
            if item_type:
                item_api_type = self._infer_type(item)
                if item_api_type != item_type:
                    continue

            results.append(item)

            if len(results) >= limit:
                break

        return results

    def _infer_type(self, item: dict) -> str | None:
        """
        Infiere el tipo de item.
        Misma lógica que ItemsService.inferType() de Angular.
        """
        raw_type = (item.get("type", "") or "").lower()
        if raw_type == "magicitem":
            return "magicitem"

        category = item.get("equipment_category", {}).get("index", "")

        if category == "armor":
            return "armor"
        if category == "weapon":
            return "weapon"
        if category == "tool":
            return "tool"
        if category == "adventuring-gear":
            return "adventuringgear"
        if category in ("mounts-and-vehicles", "mount"):
            return "mount"
        if item.get("rarity"):
            return "magicitem"

        # Fallback por nombre
        name = (item.get("name", "") or "").lower()
        if any(w in name for w in ["armor", "shield"]):
            return "armor"
        if any(w in name for w in ["sword", "axe", "bow", "dagger", "mace", "spear", "weapon"]):
            return "weapon"
        if any(w in name for w in ["tool", "kit", "instrument"]):
            return "tool"
        if any(w in name for w in ["mount", "horse", "vehicle"]):
            return "mount"

        return "adventuringgear"

    # ================================================================
    # BÚSQUEDAS POR TIPO
    # ================================================================

    def search_weapons(self, text: str, limit: int = 5) -> list[dict]:
        """Busca armas en la API."""
        return self.search_items(text=text, item_type="weapon", limit=limit)

    def search_armor(self, text: str, limit: int = 5) -> list[dict]:
        """Busca armaduras en la API."""
        return self.search_items(text=text, item_type="armor", limit=limit)

    def search_magic_items(self, text: str, limit: int = 5) -> list[dict]:
        """Busca objetos mágicos en la API."""
        return self.search_items(text=text, item_type="magicitem", limit=limit)

    def search_all(self, text: str, limit: int = 5) -> list[dict]:
        """Busca en todos los tipos."""
        return self.search_items(text=text, item_type=None, limit=limit)

    # ================================================================
    # MONSTERS — MonstersService de Angular
    # ================================================================

    def search_monsters(self, text: str, limit: int = 5) -> list[dict]:
        """Busca monstruos por nombre en la API."""
        all_monsters = self._get("/monsters/", params={"limit": 100})

        if not isinstance(all_monsters, list):
            return []

        name_lower = text.lower()
        results = [
            m for m in all_monsters
            if name_lower in m.get("name", "").lower()
        ]

        return results[:limit]

    # ================================================================
    # SPELLS — SpellsService de Angular
    # ================================================================

    def search_spells(self, text: str, limit: int = 5) -> list[dict]:
        """Busca conjuros por nombre en la API."""
        all_spells = self._get("/spells/", params={"limit": 100})

        if not isinstance(all_spells, list):
            return []

        name_lower = text.lower()
        results = [
            s for s in all_spells
            if name_lower in s.get("name", "").lower()
        ]

        return results[:limit]

    # ================================================================
    # CONTEXTO FORMATEADO PARA LA IA
    # ================================================================

    def build_context(self, text: str, element_type: str | None = None) -> str:
        """
        Busca en la API según el tipo y devuelve el resultado
        formateado como JSON listo para inyectar en el prompt de la IA.

        Args:
            text: Texto a buscar
            element_type: Tipo (weapon, armor, monster, spell, etc.)

        Returns:
            String con JSON de resultados
        """
        type_handlers = {
            "weapon": self.search_weapons,
            "armor": self.search_armor,
            "magicitem": self.search_magic_items,
            "monster": self.search_monsters,
            "spell": self.search_spells,
        }

        handler = type_handlers.get(element_type, self.search_items)

        results = handler(text) if element_type else self.search_all(text)

        if not results:
            return f"No se encontraron datos en la API para '{text}'."

        return json.dumps(results, indent=2, ensure_ascii=False)


# ============================================================
# EJEMPLO DE USO COMO SCRIPT
# ============================================================

if __name__ == "__main__":
    print("=" * 50)
    print("API SEARCH — BÚSQUEDA EN API REST DND")
    print("  (reemplaza la conexión directa a MongoDB)")
    print("=" * 50)

    api = ApiSearch()

    # Prueba 1: buscar por nombre
    print("\n\n1. Buscando 'Longsword' por nombre...")
    item = api.find_by_name("Longsword")

    if item:
        print(json.dumps(item, indent=2, ensure_ascii=False))
    else:
        print("  ⚠️  No encontrado. ¿Está la API corriendo en http://localhost:8000?")

    # Prueba 2: buscar armas por texto
    print("\n\n2. Buscando armas con 'espada'...")
    items = api.search_weapons("espada")

    if items:
        print(json.dumps(items, indent=2, ensure_ascii=False))
    else:
        print("  ⚠️  Sin resultados. Probá con otros términos.")

    # Prueba 3: contexto formateado para IA
    print("\n\n3. Contexto formateado para prompt de IA...")
    contexto = api.build_context("longsword", "weapon")
    print(contexto[:500] + "..." if len(contexto) > 500 else contexto)
