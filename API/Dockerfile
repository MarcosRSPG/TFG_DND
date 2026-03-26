FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

EXPOSE 5678

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import os, hashlib, urllib.request; from dotenv import load_dotenv; load_dotenv('/app/.env'); token = os.getenv('API_TOKEN', ''); token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest() if token else ''; req = urllib.request.Request('http://localhost:8000/health', headers={'X-API-Token': token_hash}); urllib.request.urlopen(req)"
