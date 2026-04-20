@echo off
echo Restarting all services...
echo.

echo [Phase 1] Stopping all services...
call "%~dp0停止所有服务.bat"

echo.
echo [Phase 2] Starting all services...
echo.
call "%~dp0启动所有服务.bat"
