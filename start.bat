@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   学生教育系统智能体 - 启动脚本
echo   设计师：内师智能体系统 (￣▽￣)ﾉ
echo ========================================
echo.

REM ===== 步骤1：清理旧的Node进程 =====
echo [1/4] 清理旧的Node进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ 旧进程已清理
echo.

REM ===== 步骤2：启动后端服务 =====
echo [2/4] 启动后端服务...
echo   正在启动后端服务...

REM ✨ 修复：使用 /d 参数确保目录切换成功
start "Backend Server" /d "%~dp0backend" cmd /k "npm start"

REM 等待后端启动（最多等待30秒）
echo   等待后端服务启动...
set /a count=0
:wait_backend
timeout /t 2 /nobreak >nul
set /a count+=2
curl -s http://localhost:3000/health >nul 2>&1
if !errorlevel! equ 0 (
    echo.
    echo ✓ 后端服务启动成功！
    goto start_frontend
)
if !count! lss 30 (
    echo   等待中... (!count!/30秒)
    goto wait_backend
) else (
    echo.
    echo ⚠ 后端服务启动超时，但继续启动前端...
    goto start_frontend
)

:start_frontend
echo.

REM ===== 步骤3：启动前端服务 =====
echo [3/4] 启动前端服务...
echo   正在启动前端服务...

REM ✨ 修复：使用 /d 参数确保目录切换成功
start "Frontend Server" /d "%~dp0frontend" cmd /k "npm run dev"

echo ✓ 前端服务启动中...
echo.

REM ===== 步骤4：显示服务信息 =====
echo [4/4] 服务启动完成！
echo.
echo ========================================
echo   🎉 所有服务已启动
echo ========================================
echo.
echo   📍 后端服务: http://localhost:3000
echo   📍 前端服务: http://localhost:5173
echo   📍 健康检查: http://localhost:3000/health
echo.
echo   💡 提示：
echo   - 后端使用 npm start（不使用nodemon，避免自动重启）
echo   - 前端代理超时已设置为60秒（支持RAG长耗时处理）
echo   - 关闭此窗口不会停止服务（请在各自窗口中停止）
echo.
echo ========================================
echo.

REM 等待5秒后打开浏览器
timeout /t 5 /nobreak >nul
echo 正在打开浏览器...
start http://localhost:5173

echo.
echo ✅ 启动完成！按任意键退出...
pause >nul
