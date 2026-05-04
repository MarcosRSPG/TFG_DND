FROM python:3.12-slim

WORKDIR /app

# Instalar bash para permitir docker exec -it /bin/bash
RUN apt-get update && apt-get install -y bash && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
EXPOSE 5678

# NO HEALTHCHECK - la API se ejecuta manualmente
# Para iniciar: docker exec tfg_backend python -m uvicorn main:app --host 0.0.0.0 --port 8000
