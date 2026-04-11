@echo off
chcp 65001 > nul
title 教育系统智能体 - 停止服务

echo ========================================
echo   教育系统智能体 - 后台管理系统
echo   停止所有服务
echo ========================================
echo.

:: 停止占用 3005 端口的进程（后台后端）
echo [1/2] 停止后端服务 (端口 3005)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3005.*LISTENING"') do (
    powershell -Command "Stop-Process -Id %%a -Force -ErrorAction SilentlyContinue"
)
echo        后端已停止（或未运行）

echo.

:: 停止占用 5176 端口的进程（后台前端）
echo [2/2] 停止前端服务 (端口 5176)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5176.*LISTENING"') do (
    powershell -Command "Stop-Process -Id %%a -Force -ErrorAction SilentlyContinue"
)
echo        前端已停止（或未运行）

echo.
echo ========================================
echo   所有服务已停止！
echo ========================================
echo.
pause
