#!/bin/bash

#############################################
# 表单下载功能快速修复脚本
# 作者：内师智能体系统 (￣▽￣)ﾉ
# 用途：自动修复常见的表单下载问题
#############################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "  表单下载功能快速修复工具"
echo "  作者：内师智能体系统 (￣▽￣)ﾉ"
echo "========================================="
echo ""

# 确认执行
read -p "⚠️  此脚本将修复表单下载功能，是否继续？(y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""
echo "🔧 开始修复..."
echo ""

# 修复1: 创建表单目录并设置权限
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  修复表单目录权限"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FORM_DIR="./backend/exports/forms"
mkdir -p "$FORM_DIR"
chmod 755 "$FORM_DIR"

echo -e "${GREEN}✅ 目录已创建并设置权限${NC}"
echo "   路径: $FORM_DIR"
echo "   权限: $(stat -c '%a' "$FORM_DIR" 2>/dev/null || stat -f '%A' "$FORM_DIR")"
echo ""

# 修复2: 检查并创建 .gitignore
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  更新 .gitignore"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GITIGNORE_FILE="./backend/exports/.gitignore"
mkdir -p "./backend/exports"
cat > "$GITIGNORE_FILE" << 'EOF'
# 忽略生成的表单文件
forms/
*.docx
EOF

echo -e "${GREEN}✅ .gitignore 已创建${NC}"
echo ""

# 修复3: 检查后端环境配置
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  检查后端环境配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "./backend/.env" ]; then
    echo -e "${GREEN}✅ .env 文件存在${NC}"

    # 检查CORS配置
    if grep -q "CORS_ORIGIN=\*" ./backend/.env; then
        echo -e "${GREEN}✅ CORS已配置为允许所有来源${NC}"
    else
        echo -e "${YELLOW}⚠️  CORS配置可能需要调整${NC}"
    fi
else
    echo -e "${RED}❌ .env 文件不存在${NC}"
    echo "   请复制 .env.example 并配置环境变量"
fi
echo ""

# 修复4: 创建nginx配置示例
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  创建nginx配置示例"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NGINX_CONF="./nginx-config-example.conf"
cat > "$NGINX_CONF" << 'EOF'
# nginx配置示例
# 作者：内师智能体系统 (￣▽￣)ﾉ
#
# 使用方法：
# 1. 复制此文件到 /etc/nginx/sites-available/education-system
# 2. 修改 server_name 为你的域名或IP
# 3. 修改 root 路径为你的前端构建目录
# 4. 创建软链接: sudo ln -s /etc/nginx/sites-available/education-system /etc/nginx/sites-enabled/
# 5. 测试配置: sudo nginx -t
# 6. 重启nginx: sudo systemctl reload nginx

server {
    listen 80;
    server_name 47.108.233.194;  # 修改为你的域名或IP

    # 日志
    access_log /var/log/nginx/education-access.log;
    error_log /var/log/nginx/education-error.log;

    # 前端静态文件
    location / {
        root /var/www/education-system/frontend/dist;  # 修改为实际路径
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 重要：允许大文件下载
        proxy_max_temp_file_size 0;
        proxy_buffering off;
    }

    # 特别处理：表单下载路径
    location /api/forms/download/ {
        proxy_pass http://localhost:3000/api/forms/download/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 下载文件需要这些配置
        proxy_buffering off;
        proxy_request_buffering off;
    }
}

# HTTPS配置（可选，推荐生产环境使用）
# server {
#     listen 443 ssl http2;
#     server_name 47.108.233.194;
#
#     ssl_certificate /path/to/cert.pem;
#     ssl_certificate_key /path/to/key.pem;
#
#     # 其他配置同上...
# }
EOF

echo -e "${GREEN}✅ nginx配置示例已创建${NC}"
echo "   文件路径: $NGINX_CONF"
echo ""

# 修复5: 检查并重启服务
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  重启服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 询问是否重启nginx
read -p "是否重启nginx？(y/n): " restart_nginx
if [ "$restart_nginx" = "y" ] || [ "$restart_nginx" = "Y" ]; then
    if command -v nginx &> /dev/null; then
        echo "正在重启nginx..."
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ nginx已重启${NC}"
    else
        echo -e "${YELLOW}⚠️  nginx未安装或命令不可用${NC}"
    fi
fi

echo ""

# 询问是否重启后端
read -p "是否重启后端服务？(y/n): " restart_backend
if [ "$restart_backend" = "y" ] || [ "$restart_backend" = "Y" ]; then
    echo "正在重启后端服务..."
    if command -v pm2 &> /dev/null; then
        pm2 restart all
        echo -e "${GREEN}✅ 后端服务已重启 (PM2)${NC}"
    else
        echo -e "${YELLOW}⚠️  请手动重启后端服务${NC}"
        echo "   使用PM2: pm2 restart all"
        echo "   或直接运行: npm start"
    fi
fi

echo ""

# 修复6: 创建测试脚本
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  创建测试脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TEST_SCRIPT="./test-form-download.sh"
cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash
# 表单下载功能测试脚本

echo "🧪 测试表单下载功能..."
echo ""

# 获取JWT token（需要先登录）
echo "请先获取JWT token（通过登录接口）"
read -p "输入JWT token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Token不能为空"
    exit 1
fi

echo ""
echo "1️⃣ 测试表单生成接口..."
curl -X POST http://localhost:3000/api/forms/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"templateName":"竞赛申请表"}' \
  | jq '.'

echo ""
echo "2️⃣ 测试表单列表接口..."
curl -X GET http://localhost:3000/api/forms \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

echo ""
echo "✨ 测试完成！"
EOF

chmod +x "$TEST_SCRIPT"
echo -e "${GREEN}✅ 测试脚本已创建${NC}"
echo "   文件路径: $TEST_SCRIPT"
echo ""

# 完成提示
echo "========================================="
echo "✨ 修复完成！"
echo "========================================="
echo ""
echo -e "${GREEN}已完成的修复项：${NC}"
echo "  ✅ 表单目录权限已修复"
echo "  ✅ .gitignore已更新"
echo "  ✅ nginx配置示例已创建"
echo "  ✅ 测试脚本已创建"
echo ""
echo -e "${BLUE}下一步操作：${NC}"
echo "  1. 查看nginx配置示例: cat nginx-config-example.conf"
echo "  2. 部署nginx配置（参考上面的说明）"
echo "  3. 运行诊断脚本: bash check-form-download.sh"
echo "  4. 运行测试脚本: bash test-form-download.sh"
echo ""
echo -e "${YELLOW}重要提示：${NC}"
echo "  - 请根据实际情况修改nginx配置中的路径"
echo "  - 确保后端服务在3000端口运行"
echo "  - 查看详细文档: FORM_DOWNLOAD_FIX_GUIDE.md"
echo ""
echo "哼，本小姐的修复工具一定能解决问题！(￣▽￣)ﾉ"
echo ""
