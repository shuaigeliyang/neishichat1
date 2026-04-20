@echo off
chcp 65001 >/dev/null
echo ================================================
echo         Start All Services
echo ================================================
echo.

set PROJECT_DIR=%~dp0
set PYTHON_ENV=%PROJECT_DIR%.venv\Scripts\python.exe
set EMBEDDING_SCRIPT=%PROJECT_DIR%embedding_server.py

echo [1/5] Starting Python Embedding Service (port 5001)...
tasklist | findstr "python.exe" >/dev/null 2>&1
if errorlevel 1 (
    if exist "%PYTHON_ENV%" (
        echo   Using virtual environment: %PYTHON_ENV%
        start "Embedding-Service" cmd /k "%PYTHON_ENV% %EMBEDDING_SCRIPT%"
    ) else (
        echo   Using system Python
        start "Embedding-Service" cmd /k "python %EMBEDDING_SCRIPT%"
    )
    echo   Waiting 15 seconds for service to initialize...
    timeout /t 15 /nobreak >/dev/null

    echo   Checking health...
    curl -s http://localhost:5001/health >/dev/null 2>&1
    if %errorlevel% equ 0 (
        echo   [SUCCESS] Python Embedding Service is running!
    ) else (
        echo   [WARNING] Service may not be ready yet.
    )
) else (
    echo   [INFO] Python already running.
)

echo.
echo [2/5] Starting Main Backend (port 3000)...
netstat -ano | findstr ":3000" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Main-Backend" cmd /k "cd /d %PROJECT_DIR%主系统\backend && npm start"
    echo   Waiting 10 seconds...
    timeout /t 10 /nobreak >/dev/null

    echo   Checking health...
    curl -s http://localhost:3000/health >/dev/null 2>&1
    if %errorlevel% equ 0 (
        echo   [SUCCESS] Main Backend is running!
    ) else (
        echo   [WARNING] Backend may not be ready yet.
    )
) else (
    echo   [INFO] Main Backend already running.
)

echo.
echo [3/5] Starting Admin Backend (port 3005)...
netstat -ano | findstr ":3005" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Admin-Backend" cmd /k "cd /d %PROJECT_DIR%后台管理系统\backend && npm start"
    echo   Waiting 10 seconds...
    timeout /t 10 /nobreak >/dev/null

    echo   [INFO] Admin Backend started (check window for errors).
) else (
    echo   [INFO] Admin Backend already running.
)

echo.
echo [4/5] Starting Main Frontend (port 5173)...
netstat -ano | findstr ":5173" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Main-Frontend" cmd /k "cd /d %PROJECT_DIR%主系统\frontend && npm run dev"
    echo   Waiting 8 seconds...
    timeout /t 8 /nobreak >/dev/null
) else (
    echo   [INFO] Main Frontend already running.
)

echo.
echo [5/5] Starting Admin Frontend (port 5176)...
netstat -ano | findstr ":5176" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Admin-Frontend" cmd /k "cd /d %PROJECT_DIR%后台管理系统\frontend && npm run dev"
    echo   Waiting 8 seconds...
    timeout /t 8 /nobreak >/dev/null
) else (
    echo   [INFO] Admin Frontend already running.
)

echo.
echo ================================================
echo         All Services Started!
echo ================================================
echo.
echo Service URLs:
echo   - Main Frontend:     http://localhost:5173
echo   - Admin Frontend:    http://localhost:5176
echo   - Main Backend:      http://localhost:3000
echo   - Admin Backend:     http://localhost:3005
echo   - Embedding Service: http://localhost:5001
echo.
echo Opening browsers...
timeout /t 2 /nobreak >/dev/null
start http://localhost:5173
timeout /t 1 /nobreak >/dev/null
start http://localhost:5176

echo.
echo Done! Check the service windows for any errors.
echo.
pause
