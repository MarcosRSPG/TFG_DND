#!/usr/bin/env python3
"""
Script to populate class_progression_config collection from JSON file.
Run this script to import the class-progression-config.json into MongoDB.
"""

import asyncio
import json
import sys
import os

# Add the API directory to the path so we can import db module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_db


async def populate_class_progression():
    """Read JSON and populate MongoDB collection"""
    try:
        # Read the JSON file
        # When running in Docker, the file should be at /app/class-progression-config.json
        # When running locally, look relative to the script location
        if os.path.exists('/app/class-progression-config.json'):
            # Running inside Docker
            json_path = '/app/class-progression-config.json'
        else:
            # Running locally
            json_path = os.path.join(
                os.path.dirname(__file__), 
                '..', 'APP', 'src', 'assets', 'class-progression-config.json'
            )
            json_path = os.path.normpath(json_path)
        
        print(f"Reading from: {json_path}")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"Loaded JSON with {len(data)} classes")
        
        # Get database connection
        db = await get_db()
        collection = db["class_progression_config"]
        
        # Clear existing data (optional - comment out if you want to keep existing)
        await collection.delete_many({})
        print("Cleared existing class_progression_config collection")
        
        # Insert each class config
        count = 0
        for class_name, config in data.items():
            # Prepare document
            doc = dict(config)
            doc['class_name'] = class_name
            
            # Upsert based on class_name
            result = await collection.update_one(
                {"class_name": class_name},
                {"$set": doc},
                upsert=True
            )
            count += 1
            print(f"  ✓ {class_name}: {'inserted' if result.upserted_id else 'updated'}")
        
        print(f"\n✅ Successfully populated {count} class progression configs")
        
        # Verify by counting documents
        total = await collection.count_documents({})
        print(f"Total documents in class_progression_config: {total}")
        
    except FileNotFoundError:
        print(f"❌ Error: JSON file not found at {json_path}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error populating database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Close the database connection
        from db import close_db
        await close_db()


if __name__ == "__main__":
    print("Starting class progression population script...")
    asyncio.run(populate_class_progression())
    print("Script completed.")
