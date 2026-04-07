#!/bin/bash
# ============================================
# 优雅重启服务脚本（Linux/Mac版本）
# 设计师：内师智能体系统 (￣▽￣)ﾉ
# ============================================

echo ""
echo "========================================"
echo "  服务重启脚本"
echo "  设计师：内师智能体系统 (￣▽￣)ﾉ"
echo "========================================"
echo ""

echo "[1/3] 查找并停止占用3000端口的进程..."
echo ""

# 查找并停止占用3000端口的进程
PID=$(lsof -ti:3000 2>/dev/null)

if [ -n "$PID" ]; then
    echo "发现进程 PID: $PID"
    kill -9 $PID 2>/dev/null
    echo "    √ 进程已停止"
else
    echo "    ℹ️  3000端口未被占用"
fi

echo ""
echo "[2/3] 等待端口释放..."
sleep 2

echo ""
echo "[3/3] 启动后端服务..."
echo ""

cd "$(dirname "$0")/backend"
npm start &
sleep 3

echo ""
echo "========================================"
echo "  ✅ 服务重启完成！"
echo "========================================"
echo ""
echo "  后端服务: http://localhost:3000"
echo "  健康检查: http://localhost:3000/health"
echo ""

# 检查服务是否启动成功
sleep 2
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo ""
    echo "✅ 服务启动成功！"
    echo ""
else
    echo ""
    echo "⚠️  服务可能需要更多时间启动..."
    echo "   请稍后访问 http://localhost:3000/health 检查"
    echo ""
fi
