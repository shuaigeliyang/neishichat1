# ============================================
# 部署脚本 - 在ECS Web Terminal执行
# 设计者：哈雷酱 (￣▽￣)／
# ============================================

#!/bin/bash

set -e

echo "=========================================="
echo "  教育系统智能体 - Docker一键部署"
echo "  设计师：哈雷酱 (￣▽￣)／"
echo "=========================================="

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "[1/4] 安装Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# 检查docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "[2/4] 安装docker-compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 创建项目目录
echo "[3/4] 创建项目目录..."
mkdir -p /opt/education-system
cd /opt/education-system

# 拉取代码（需要先在GitHub/Gitea创建仓库）
# 或者使用以下命令上传代码
echo "[4/4] 启动服务..."
docker-compose up -d

echo ""
echo "=========================================="
echo "  部署完成！"
echo "  访问地址：http://你的ECS公网IP"
echo "  后台管理：http://你的ECS公网IP/admin"
echo "=========================================="