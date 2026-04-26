#!/usr/bin/env python3
"""Script to fetch and store class levels from remote API to local MongoDB"""
import asyncio
import httpx
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DATABASE


async def fetch_class_levels():
    """Fetch all class levels from remote API and store in MongoDB"""
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    
    # Get list of classes
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as http:
        # Get all classes
        response = await http.get("https://www.dnd5eapi.co/api/2014/classes")
        classes_data = response.json()
        
        classes = classes_data.get("results", [])
        print(f"Found {len(classes)} classes")
        
        for cls in classes:
            class_index = cls.get("index")
            print(f"Fetching levels for {class_index}...")
            
            # Fetch levels for this class
            levels_response = await http.get(f"https://www.dnd5eapi.co/api/2014/classes/{class_index}/levels")
            levels = levels_response.json()
            
            if levels:
                # Store each level in MongoDB
                collection = db["class_levels"]
                for level in levels:
                    # Remove MongoDB _id if present
                    level.pop("_id", None)
                    # Add class index to level document
                    level["class"] = class_index
                    
                    await collection.update_one(
                        {"index": level.get("index")},
                        {"$set": level},
                        upsert=True
                    )
                
                print(f"  Stored {len(levels)} levels for {class_index}")
            else:
                print(f"  No levels found for {class_index}")
    
    # Print count
    count = await db["class_levels"].count_documents({})
    print(f"\nTotal class levels in MongoDB: {count}")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(fetch_class_levels())