@echo off
chcp 65001
echo ==================================================
      Stop All Services
echo ==================================================
echo.

echo [Step 1] Checking Embedding (port 5001)...
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Embedding on port 5001!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do (
        echo   PID: %%a
        echo   Attempting to kill...
        taskkill /F /PID %%a >nul
        echo   Kill command executed.
    )
    timeout /t 2 /nobreak >nul
    netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
    if %errorlevel% equ 0 (
        echo   [FAILED] Embedding still running!
    ) else (
        echo   [SUCCESS] Embedding stopped.
    )
) else (
    echo   [INFO] Embedding not running.
)

echo.
echo [Step 2] Checking Main Backend (port 3000)...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Main Backend on port 3000!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        echo   PID: %%a
        taskkill /F /PID %%a >nul
    )
) else (
    echo   [INFO] Main Backend not running.
)

echo.
echo [Step 3] Checking Admin Backend (port 3005)...
netstat -ano | findstr ":3005" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Admin Backend on port 3005!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3005" ^| findstr "LISTENING"') do (
        echo   PID: %%a
        taskkill /F /PID %%a >nul
    )
) else (
    echo   [INFO] Admin Backend not running.
)

echo.
echo [Step 4] Checking Main Frontend (port 5173)...
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Main Frontend on port 5173!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
        echo   PID: %%a
        taskkill /F /PID %%a >nul
    )
) else (
    echo   [INFO] Main Frontend not running.
)

echo.
echo [Step 5] Checking Admin Frontend (port 5176)...
netstat -ano | findstr ":5176" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo   Found Admin Frontend on port 5176!
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5176" ^| findstr "LISTENING"') do (
        echo   PID: %%a
        taskkill /F /PID %%a >nul
    )
) else (
    echo   [INFO] Admin Frontend not running.
)

echo.
echo [Step 6] Cleanup remaining processes...
echo Killing remaining Node.js...
taskkill /F /IM node.exe 2>nul

echo Killing remaining Python...
taskkill /F /IM python.exe 2>nul

echo.
echo ==================================================
echo  All Services Stopped!
echo ==================================================
echo.
pause
