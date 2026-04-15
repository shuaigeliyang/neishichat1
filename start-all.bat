@echo off
chcp 65001 >nul
echo ========================================
echo   教育系统智能体 - 一键启动脚本
echo   设计师：哈雷酱 (￣▽￣)ﾉ
echo ========================================
echo.

:: 检查端口5001是否已被占用
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [INFO] Python Embedding服务已在运行 (port 5001)
    goto :check_backend
)

:: 启动Python Embedding服务
echo [1/2] 启动Python Embedding服务...
cd /d "%~dp0backend"
start "Python Embedding" cmd /c "python local_embedding_service.py"
echo [OK] Python Embedding服务启动中（需要等待模型加载，约30秒）
timeout /t 5 /nobreak >nul

:: 检查Python服务是否启动成功
:check_python
curl -s http://localhost:5001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python Embedding服务已就绪
) else (
    echo [INFO] 等待服务启动...
    timeout /t 3 /nobreak >nul
    goto :check_python
)

:check_backend
:: 检查端口3000是否已被占用
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [INFO] 后端服务已在运行 (port 3000)
    goto :done
)

:: 启动后端服务
echo.
echo [2/2] 启动后端服务...
cd /d "%~dp0backend"
start "Backend API" cmd /c "npm start"
echo [OK] 后端服务启动中...

:: 等待后端启动
timeout /t 5 /nobreak >nul

:: 检查后端服务
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 后端服务已就绪
) else (
    echo [INFO] 等待后端启动...
    timeout /t 3 /nobreak >nul
)

:done
echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo   Python Embedding: http://localhost:5001
echo   后端API:          http://localhost:3000
echo   健康检查:         http://localhost:3000/health
echo.
echo   按任意键打开浏览器测试...
pause >nul
start http://localhost:3000
