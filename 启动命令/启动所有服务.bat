@echo off
chcp 65001 >/dev/null 2>&1
echo Starting all services...
echo.

set PYTHON_PATH=E:\外包\教育系统智能体\.venv\Scripts\python.exe

echo [1/5] Starting Embedding (mirror)...
cd /d "%~dp0..\backend"
tasklist | findstr "python.exe" >/dev/null 2>&1
if errorlevel 1 (
    start "Embedding" cmd /k "%PYTHON_PATH% local_embedding_service_mirror.py"
    echo Waiting 30 seconds...
    timeout /t 30 /nobreak >/dev/null
) else (
    echo Python already running
)

echo [2/5] Starting Main Backend...
cd /d "%~dp0..\主系统\backend"
netstat -ano | findstr ":3000" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Main-Backend" cmd /k "npm start"
    echo Waiting 10 seconds...
    timeout /t 10 /nobreak >/dev/null
) else (
    echo Main Backend already running
)

echo [3/5] Starting Admin Backend...
cd /d "%~dp0..\后台管理系统\backend"
if not exist "dist" (
    echo Building TypeScript files...
    call npm run build
    echo Build complete!
)
netstat -ano | findstr ":3005" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Admin-Backend" cmd /k "npm start"
    echo Waiting 10 seconds...
    timeout /t 10 /nobreak >/dev/null
) else (
    echo Admin Backend already running
)

echo [4/5] Starting Main Frontend...
cd /d "%~dp0..\主系统\frontend"
netstat -ano | findstr ":5173" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Main-Frontend" cmd /k "npm run dev"
    echo Waiting 8 seconds...
    timeout /t 8 /nobreak >/dev/null
) else (
    echo Main Frontend already running
)

echo [5/5] Starting Admin Frontend...
cd /d "%~dp0..\后台管理系统\frontend"
netstat -ano | findstr ":5176" | findstr "LISTENING" >/dev/null
if errorlevel 1 (
    start "Admin-Frontend" cmd /k "npm run dev"
    echo Waiting 8 seconds...
    timeout /t 8 /nobreak >/dev/null
) else (
    echo Admin Frontend already running
)

echo.
echo All services started!
echo.
echo URLs:
echo   Main Frontend:     http://localhost:5173
echo   Admin Frontend:    http://localhost:5176
echo   Main Backend:      http://localhost:3000
echo   Admin Backend:     http://localhost:3005
echo   Embedding Service: http://localhost:5001
echo.
timeout /t 2 /nobreak >/dev/null
start http://localhost:5173
timeout /t 1 /nobreak >/dev/null
start http://localhost:5176

pause
