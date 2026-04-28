"""
Utility for handling image uploads in multipart/form-data requests.
Supports both JSON and multipart bodies transparently.
"""

import json
import shutil
from pathlib import Path

from fastapi import Request


async def parse_form_or_json(request: Request, collection: str) -> dict:
    """
    Parse a request body that may be either JSON or multipart/form-data.

    If an image file is present in the form, saves it to:
        images/images/{collection}/{index}.{ext}
    and sets:
        data["image"] = f"/images/{collection}/{index}.{ext}"

    Args:
        request:    The incoming FastAPI request.
        collection: Subdirectory name inside images/images/ (e.g. "monsters", "spells").

    Returns:
        dict with the parsed payload, image path already injected if applicable.
    """
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" not in content_type:
        return await request.json()

    form = await request.form()
    data: dict = {}

    # Parse all non-file fields; values may be JSON-encoded objects/arrays
    for key, value in form.items():
        if key == "image":
            continue
        if isinstance(value, str):
            try:
                data[key] = json.loads(value)
            except (json.JSONDecodeError, ValueError):
                data[key] = value

    # Handle the image file (if present)
    image_field = form.get("image")
    if image_field and hasattr(image_field, "filename") and image_field.filename:
        index: str = (
            data.get("index")
            or data.get("name", "custom").lower().replace(" ", "-")
        )
        suffix = Path(image_field.filename).suffix or ".png"
        filename = f"{index}{suffix}"

        images_dir = Path(f"images/images/{collection}")
        images_dir.mkdir(parents=True, exist_ok=True)

        with open(images_dir / filename, "wb") as f:
            shutil.copyfileobj(image_field.file, f)

        data["image"] = f"/images/{collection}/{filename}"

    return data
