@echo off
title Education System - Quick Start

echo ========================================
echo   Education System Admin Panel
echo   Quick Start Script
echo ========================================
echo.

set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

echo [Step 1/2] Starting Backend (port 3005)...
pushd "%SCRIPT_DIR%\backend"
start "Backend-3005" cmd /k "npm run dev"
popd

echo [Step 2/2] Starting Frontend (port 5176)...
pushd "%SCRIPT_DIR%\frontend"
start "Frontend-5176" cmd /k "npm run dev"
popd

echo.
echo ========================================
echo   Done!
echo.
echo   URLs:
echo   - Backend API: http://localhost:3005
echo   - Frontend:   http://localhost:5176
echo.
echo   Opening browser...
echo ========================================
pause > nul

start http://localhost:5176

echo.
echo Services are running in background.
echo To stop: close windows "Backend-3005" and "Frontend-5176"
echo.
pause
