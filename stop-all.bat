@echo off
chcp 65001 >nul
echo ================================================
echo         Stop All Services
echo ================================================
echo.

echo [Step 1] Checking Python Embedding (port 5001)...
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Python Embedding on port 5001!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do (
        echo   Killing PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
    if %errorlevel% equ 0 (
        echo   [FAILED] Still running!
    ) else (
        echo   [SUCCESS] Python Embedding stopped.
    )
) else (
    echo   [INFO] Python Embedding not running.
)

echo.
echo [Step 2] Checking Main Backend (port 3000)...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Main Backend on port 3000!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        echo   Killing PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
) else (
    echo   [INFO] Main Backend not running.
)

echo.
echo [Step 3] Checking Admin Backend (port 3005)...
netstat -ano | findstr ":3005" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Admin Backend on port 3005!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3005" ^| findstr "LISTENING"') do (
        echo   Killing PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
) else (
    echo   [INFO] Admin Backend not running.
)

echo.
echo [Step 4] Checking Main Frontend (port 5173)...
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Main Frontend on port 5173!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
        echo   Killing PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
) else (
    echo   [INFO] Main Frontend not running.
)

echo.
echo [Step 5] Checking Admin Frontend (port 5176)...
netstat -ano | findstr ":5176" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Admin Frontend on port 5176!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5176" ^| findstr "LISTENING"') do (
        echo   Killing PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
) else (
    echo   [INFO] Admin Frontend not running.
)

echo.
echo [Step 6] Cleanup remaining processes...
echo   Killing remaining Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo   Killing remaining Python processes...
taskkill /F /IM python.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo ================================================
echo         All Services Stopped!
echo ================================================
echo.
timeout /t 2 /nobreak >nul
