@echo off
REM ============================================
REM 优雅重启服务脚本
REM 设计师：内师智能体系统 (￣▽￣)ﾉ
REM 功能：停止旧服务并启动新服务
REM ============================================

echo.
echo ========================================
echo   服务重启脚本
echo   设计师：内师智能体系统 (￣▽￣)ﾉ
echo ========================================
echo.

echo [1/3] 查找并停止占用3000端口的进程...
echo.

REM 查找占用3000端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo 发现进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! (
        echo     √ 进程已停止
    ) else (
        echo     × 进程停止失败或不存在
    )
)

echo.
echo [2/3] 等待端口释放...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] 启动后端服务...
echo.

cd /d "%~dp0backend"
start /B npm start > nul 2>&1

echo.
echo ========================================
echo   ✅ 服务重启完成！
echo ========================================
echo.
echo   后端服务: http://localhost:3000
echo   健康检查: http://localhost:3000/health
echo.
echo   提示：使用 stop-server.bat 停止服务
echo ========================================
echo.

timeout /t 3 /nobreak >nul

REM 检查服务是否启动成功
curl -s http://localhost:3000/health >nul 2>&1
if !errorlevel! (
    echo.
    echo ✅ 服务启动成功！
    echo.
) else (
    echo.
    echo ⚠️  服务可能需要更多时间启动...
    echo    请稍后访问 http://localhost:3000/health 检查
    echo.
)

pause
