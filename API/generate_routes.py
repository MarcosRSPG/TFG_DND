#!/usr/bin/env python3
"""Script to generate all API routes from MongoDB collections"""
from services.local_catalog_repository import get_all as get_all_docs

# Collections that need routes
COLLECTIONS = [
    "classes",
    "subclasses",
    "races",
    "subraces",
    "backgrounds",
    "spells",
    "monsters",
    "equipment",
    "magic-items",
    "proficiencies",
    "skills",
    "languages",
    "conditions",
    "damage-types",
    "weapon-properties",
    "equipment-categories",
    "magic-schools",
    "alignments",
    "ability-scores",
    "traits",
    "features",
    "rules",
    "rule-sections",
]

# Generate route file
routes_content = []

for coll in COLLECTIONS:
    safe_name = coll.replace("-", "_").replace("/", "_")
    routes_content.append(f'''

# Routes for {coll}
@app.get("/{coll}")
async def get_{safe_name}():
    return await get_all_docs("{coll}")


@app.get("/{coll}/{{item_id}}")
async def get_{safe_name}_by_id(item_id: str):
    return await get_by_index("{coll}", item_id)
''')

print("\n".join(routes_content))