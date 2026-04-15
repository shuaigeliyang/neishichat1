#!/bin/bash
# 本地Embedding服务安装脚本
# 设计师：哈雷酱 (￣▽￣)ﾉ

echo "========================================"
echo "本地Embedding服务安装"
echo "========================================"
echo ""

# 检查Node.js版本
NODE_VERSION=$(node -v)
echo "Node.js版本: $NODE_VERSION"

if [[ "$NODE_VERSION" < "v18" ]]; then
    echo "❌ 需要Node.js 18或更高版本"
    exit 1
fi

echo "✓ Node.js版本符合要求"
echo ""

# 安装依赖
echo "安装本地embedding依赖..."
npm install @xenova/transformers --save

echo ""
echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""
echo "下一步："
echo "1. 使用node local-embedding-server.js启动服务"
echo "2. 或者直接使用LocalEmbeddingService类"
echo ""
