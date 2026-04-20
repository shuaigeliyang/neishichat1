@echo off
chcp 65001 >/dev/null
echo ================================================
echo         Restart All Services
echo ================================================
echo.

echo [Phase 1] Stopping all services...
echo.

REM Kill all Node.js processes
echo   Killing Node.js processes...
taskkill /F /IM node.exe >/dev/null 2>&1

REM Kill all Python processes
echo   Killing Python processes...
taskkill /F /IM python.exe >/dev/null 2>&1

REM Wait for ports to be released
echo.
echo   Waiting for ports to be released...
timeout /t 5 /nobreak >/dev/null

echo.
echo [Phase 2] Starting all services...
echo.

set PROJECT_DIR=%~dp0
set PYTHON_ENV=%PROJECT_DIR%.venv\Scripts\python.exe
set EMBEDDING_SCRIPT=%PROJECT_DIR%embedding_server.py

REM Step 1: Python Embedding
echo [1/5] Starting Python Embedding Service...
if exist "%PYTHON_ENV%" (
    start "Embedding-Service" cmd /k "%PYTHON_ENV% %EMBEDDING_SCRIPT%"
) else (
    start "Embedding-Service" cmd /k "python %EMBEDDING_SCRIPT%"
)
echo   Waiting 15 seconds...
timeout /t 15 /nobreak >/dev/null

REM Step 2: Main Backend
echo [2/5] Starting Main Backend...
start "Main-Backend" cmd /k "cd /d %PROJECT_DIR%主系统\backend && npm start"
echo   Waiting 10 seconds...
timeout /t 10 /nobreak >/dev/null

REM Step 3: Admin Backend
echo [3/5] Starting Admin Backend...
start "Admin-Backend" cmd /k "cd /d %PROJECT_DIR%后台管理系统\backend && npm start"
echo   Waiting 10 seconds...
timeout /t 10 /nobreak >/dev/null

REM Step 4: Main Frontend
echo [4/5] Starting Main Frontend...
start "Main-Frontend" cmd /k "cd /d %PROJECT_DIR%主系统\frontend && npm run dev"
echo   Waiting 8 seconds...
timeout /t 8 /nobreak >/dev/null

REM Step 5: Admin Frontend
echo [5/5] Starting Admin Frontend...
start "Admin-Frontend" cmd /k "cd /d %PROJECT_DIR%后台管理系统\frontend && npm run dev"
echo   Waiting 8 seconds...
timeout /t 8 /nobreak >/dev/null

echo.
echo ================================================
echo         All Services Restarted!
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
echo Done! Check each service window for errors.
echo.
pause
