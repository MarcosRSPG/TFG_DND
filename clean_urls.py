"""
Pipeline para limpiar /api/2014 de todas las colecciones
"""

import re
from pymongo import MongoClient

MONGO_URI = "mongodb://mongo_root:mongo_root_pass@localhost:27017"
DATABASE_NAME = "db_grimledger"

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

colecciones = db.list_collection_names()
print(f"Total colecciones: {len(colecciones)}\n")

total_actualizados = 0


def limpiar_valor(valor):
    """Limpia recursivamente /api/2014 de cualquier valor."""
    if isinstance(valor, str):
        return valor.replace("/api", "")
    elif isinstance(valor, list):
        return [limpiar_valor(item) for item in valor]
    elif isinstance(valor, dict):
        return {k: limpiar_valor(v) for k, v in valor.items()}
    return valor


for nombre in colecciones:
    coll = db[nombre]
    actualizados = 0

    for doc in coll.find():
        modificado = False
        nuevo_doc = {}

        for key, value in doc.items():
            nuevo_valor = limpiar_valor(value)
            if nuevo_valor != value:
                modificado = True
            nuevo_doc[key] = nuevo_valor

        if modificado:
            coll.replace_one({"_id": doc["_id"]}, nuevo_doc)
            actualizados += 1

    if actualizados > 0:
        print(f"{nombre}: {actualizados} docs actualizados")
        total_actualizados += actualizados
    else:
        print(f"{nombre}: sin cambios")

print(f"\nTotal docs actualizados: {total_actualizados}")