@echo off
REM Script para gestionar la API manualmente (sin auto-inicio)
REM Uso: manage_api.bat [start|stop|restart|status|logs|shell]

set ACTION=%1
if "%ACTION%"=="" set ACTION=status

REM Verificar si el container existe y esta corriendo
docker inspect -f '{{.State.Running}}' tfg_backend >nul 2>&1
if errorlevel 1 (
    echo [ERROR] El container 'tfg_backend' no existe. Ejecuta: docker-compose up -d
    exit /b 1
)

if "%ACTION%"=="start" (
    echo Iniciando API manualmente...
    docker exec tfg_backend pkill -f uvicorn >nul 2>&1
    docker exec -d tfg_backend python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    echo [OK] API iniciada. Probando en http://localhost:8000
    goto end
)

if "%ACTION%"=="stop" (
    echo Deteniendo API...
    docker exec tfg_backend pkill -f uvicorn >nul 2>&1
    echo [OK] API detenida.
    goto end
)

if "%ACTION%"=="restart" (
    echo Reiniciando API...
    docker exec tfg_backend pkill -f uvicorn >nul 2>&1
    timeout /t 2 /nobreak >nul
    docker exec -d tfg_backend python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    echo [OK] API reiniciada.
    goto end
)

if "%ACTION%"=="status" (
    echo Verificando estado de la API...
    docker exec tfg_backend pgrep -f uvicorn >nul 2>&1
    if errorlevel 1 (
        echo [STOPPED] La API NO esta corriendo. Usa: manage_api.bat start
    ) else (
        echo [RUNNING] La API esta corriendo en http://localhost:8000
        docker exec tfg_backend pgrep -f uvicorn -a
    )
    goto end
)

if "%ACTION%"=="logs" (
    echo Mostrando logs de la API (Ctrl+C para salir)...
    docker exec tfg_backend tail -f /var/log/uvicorn.log 2>nul || docker logs -f tfg_backend
    goto end
)

if "%ACTION%"=="shell" (
    echo Entrando al shell del container...
    docker exec -it tfg_backend /bin/bash
    goto end
)

echo Uso: manage_api.bat [start^|stop^|restart^|status^|logs^|shell]
echo.
echo Ejemplos:
echo   manage_api.bat start   - Inicia la API manualmente
echo   manage_api.bat stop    - Detiene la API
echo   manage_api.bat status  - Verifica si esta corriendo
echo   manage_api.bat shell   - Entra al shell del container

:end
