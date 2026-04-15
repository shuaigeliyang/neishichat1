@echo off
REM 本地Embedding服务一键启动脚本
REM 设计师：哈雷酱 (￣▽￣)ﾉ

echo ========================================
echo 本地Embedding服务一键启动
echo ========================================
echo.

REM 检查Python
where python >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到Python！
    echo 请先安装Python 3.8或更高版本
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✓ Python已安装
python --version
echo.

REM 检查pip
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo 正在安装pip...
    python -m ensurepip --upgrade
)

echo ✓ pip可用
echo.

REM 安装依赖
echo 正在安装Python依赖...
echo 这可能需要几分钟，请耐心等待...
echo.

python -m pip install flask flask-cors sentence-transformers numpy --user

if errorlevel 1 (
    echo.
    echo ❌ 依赖安装失败！
    echo 请手动运行以下命令：
    echo   python -m pip install flask flask-cors sentence-transformers numpy
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ 依赖安装完成！
echo ========================================
echo.

REM 启动Python服务
echo 正在启动本地Embedding服务...
echo.

python local_embedding_service.py

pause
