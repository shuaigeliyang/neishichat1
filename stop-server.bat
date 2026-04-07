@echo off
REM ============================================
REM 停止服务脚本
REM 设计师：内师智能体系统 (￣▽￣)ﾉ
REM ============================================

echo.
echo ========================================
echo   停止服务脚本
echo   设计师：内师智能体系统 (￣▽￣)ﾉ
echo ========================================
echo.

echo 正在停止所有node进程...

REM 方案1：使用项目kill-all.bat（如果存在）
if exist "kill-all.bat" (
    call kill-all.bat
    goto :end
)

REM 方案2：手动查找并停止
echo.
echo 查找占用3000端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo 停止进程: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ========================================
echo   ✅ 服务已停止
echo ========================================
echo.

pause
exit

:end
echo.
echo 已使用项目kill-all.bat停止服务
echo.
pause
