#!/bin/bash
# 本地Embedding服务启动脚本（Linux/Mac）
# 设计师：哈雷酱 (￣▽￣)ﾉ

echo "========================================"
echo "本地Embedding服务启动"
echo "========================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到Python3！"
    echo "请先安装Python 3.8或更高版本"
    exit 1
fi

echo "✓ Python3已安装"
python3 --version
echo ""

# 检查虚拟环境
if [ ! -d ".venv_embedding" ]; then
    echo "创建虚拟环境..."
    python3 -m venv .venv_embedding
fi

echo "激活虚拟环境..."
source .venv_embedding/bin/activate

echo ""
echo "安装依赖..."
pip install -r requirements-embedding.txt

echo ""
echo "========================================"
echo "启动本地Embedding服务..."
echo "========================================"
echo ""

python local_embedding_service.py
