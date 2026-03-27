import requests
from fastapi import HTTPException
import numpy as np

async def sacar_items():
    respuesta = []
    try:
        response = requests.get("https://www.dnd5eapi.co/api/equipment")

        for item in response.json().get("results", []):
            item_detail_response = requests.get(f"https://www.dnd5eapi.co{item['url']}")
            item_detail = item_detail_response.json()
            respuesta.append(item_detail['equipment_category']['index'])
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Error retrieving items from external API: {exc}") from exc
    
    return np.unique(respuesta).tolist()


async def main():
    items = await sacar_items()
    print(items)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())