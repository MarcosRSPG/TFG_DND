FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir pandas

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
