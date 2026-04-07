#!/bin/bash

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Excel导出插件 - 启动脚本                                ║"
echo "║   内师智能体系统的完美作品 (￣▽￣)ﾉ                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误：未检测到Python环境！"
    echo "请先安装Python 3.7或更高版本"
    echo "macOS: brew install python3"
    echo "Ubuntu: sudo apt-get install python3"
    exit 1
fi

echo "✅ Python环境检测成功"
echo ""

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 正在创建虚拟环境..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ 创建虚拟环境失败！"
        exit 1
    fi
    echo "✅ 虚拟环境创建成功"
fi

echo ""
echo "🔄 激活虚拟环境..."
source venv/bin/activate

echo ""
echo "📦 正在安装依赖包..."
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败！"
    exit 1
fi

echo ""
echo "✅ 依赖安装完成"
echo ""

# 创建导出目录
if [ ! -d "exports" ]; then
    echo "📁 创建导出目录..."
    mkdir exports
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🚀 启动Excel导出服务...                                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📍 服务地址：http://localhost:5000"
echo "📄 演示页面：直接在浏览器中打开 export_demo.html"
echo ""
echo "💡 提示："
echo "   - 按 Ctrl+C 可以停止服务"
echo "   - 修改代码后服务会自动重新加载"
echo "   - 导出的文件保存在 exports/ 目录下"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# 启动Flask服务
python3 app.py
