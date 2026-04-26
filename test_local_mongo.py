from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv("C:/Users/34652/Documents/TFG/TFG_DND/API/.env")

MONGODB_USERNAME = os.getenv("MONGODB_USERNAME")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE")
MONGODB_PORT = os.getenv("MONGODB_PORT")

uri = f"mongodb://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@localhost:{MONGODB_PORT}/{MONGODB_DATABASE}?authSource=admin"
print(f"Testing: {uri.replace(MONGODB_PASSWORD, '***')}")

client = MongoClient(uri, serverSelectionTimeoutMS=5000)
db = client[MONGODB_DATABASE]

print(f"Collections in {MONGODB_DATABASE}:")
for coll_name in db.list_collection_names():
    count = db[coll_name].count_documents({})
    print(f"  {coll_name}: {count} docs")