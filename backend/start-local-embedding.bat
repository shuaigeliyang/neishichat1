@echo off
REM 本地Embedding服务启动脚本（Windows）
REM 设计师：哈雷酱 (￣▽￣)ﾉ

echo ========================================
echo 本地Embedding服务启动
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到Python！
    echo 请先安装Python 3.8或更高版本
    pause
    exit /b 1
)

echo ✓ Python已安装
echo.

REM 检查虚拟环境
if not exist ".venv_embedding" (
    echo 创建虚拟环境...
    python -m venv .venv_embedding
)

echo 激活虚拟环境...
call .venv_embedding\Scripts\activate.bat

echo.
echo 安装依赖...
pip install -r requirements-embedding.txt

echo.
echo ========================================
echo 启动本地Embedding服务...
echo ========================================
echo.

python local_embedding_service.py

pause
