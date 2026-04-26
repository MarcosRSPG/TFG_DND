"""
Descargar imagenes de TODOS los elementos de la D&D API
"""

import os
from urllib.request import urlopen, Request
from urllib.error import URLError

API_BASE = "https://www.dnd5eapi.co/api/2014"
IMAGES_DIR = "images"


def fetch(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    import json
    with urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


# Fetch raiz para ver todas las colecciones
print("Fetching collections...")
root = fetch(f"{API_BASE}/")
colecciones = list(root.keys())
print(f"Found {len(colecciones)} collections\n")

# Crear directorio base
os.makedirs(IMAGES_DIR, exist_ok=True)

total_descargados = 0
total_errores = 0

# Por cada coleccion
for nombre in colecciones:
    print(f"\n=== {nombre} ===")

    # Fetch lista de la coleccion
    data = fetch(f"{API_BASE}/{nombre}")
    results = data.get("results", [])

    if not results:
        print("  Sin resultados")
        continue

    # Crear subdirectorio para esta coleccion
    os.makedirs(f"{IMAGES_DIR}/{nombre}", exist_ok=True)

    descargados = 0
    errores = 0

    # Por cada item
    for idx, item in enumerate(results, 1):
        index = item.get("index", "")
        name = item.get("name", "")

        if not index:
            continue

        print(f"[{idx}/{len(results)}] {name}")

        try:
            # Fetch detalles para obtener imagen
            detail = fetch(f"{API_BASE}/{nombre}/{index}")
            image_path = detail.get("image", "")

            if not image_path:
                continue

            # Descargar
            image_url = f"https://www.dnd5eapi.co{image_path}"
            req = Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=30) as response:
                img_data = response.read()

            # Guardar
            filename = f"{index}.png"
            filepath = f"{IMAGES_DIR}/{nombre}/{filename}"

            with open(filepath, "wb") as f:
                f.write(img_data)

            print(f"  -> {filepath}")
            descargados += 1

        except URLError:
            errores += 1

    print(f"  {descargados} descargados, {errores} errores")
    total_descargados += descargados
    total_errores += errores

print(f"\n=== TOTAL ===")
print(f"Descargados: {total_descargados}")
print(f"Errores: {total_errores}")