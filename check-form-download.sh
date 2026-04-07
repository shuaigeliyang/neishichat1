#!/bin/bash

#############################################
# 表单下载功能诊断脚本
# 作者：内师智能体系统 (￣▽￣)ﾉ
# 用途：快速诊断服务器上的表单下载问题
#############################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  表单下载功能诊断工具"
echo "  作者：内师智能体系统 (￣▽￣)ﾉ"
echo "========================================="
echo ""

# 检查当前用户
echo "📋 当前用户: $(whoami)"
echo "📁 当前目录: $(pwd)"
echo ""

# 1. 检查后端服务
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  检查后端服务状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if pgrep -f "node.*app.js" > /dev/null; then
    echo -e "${GREEN}✅ 后端服务正在运行${NC}"
    PID=$(pgrep -f "node.*app.js")
    echo "   进程ID: $PID"
else
    echo -e "${RED}❌ 后端服务未运行${NC}"
    echo "   请启动后端服务: npm start 或 pm2 start src/app.js"
fi
echo ""

# 2. 检查后端端口
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  检查后端端口 (3000)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo -e "${GREEN}✅ 端口 3000 正在监听${NC}"
else
    echo -e "${RED}❌ 端口 3000 未监听${NC}"
    echo "   请检查后端配置或防火墙设置"
fi
echo ""

# 3. 检查表单文件目录
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  检查表单文件目录"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FORM_DIR="./backend/exports/forms"
if [ -d "$FORM_DIR" ]; then
    echo -e "${GREEN}✅ 表单目录存在: $FORM_DIR${NC}"

    # 检查权限
    PERMS=$(stat -c "%a" "$FORM_DIR" 2>/dev/null || stat -f "%A" "$FORM_DIR" 2>/dev/null)
    echo "   目录权限: $PERMS"

    # 检查文件数量
    FILE_COUNT=$(ls -1 "$FORM_DIR"/*.docx 2>/dev/null | wc -l)
    echo "   表单文件数量: $FILE_COUNT"

    if [ "$FILE_COUNT" -gt 0 ]; then
        echo "   最新的文件:"
        ls -lt "$FORM_DIR"/*.docx 2>/dev/null | head -3 | awk '{print "     " $9 " (" $6 " " $7 " " $8 ")"}'
    else
        echo -e "${YELLOW}   ⚠️  目录为空，没有表单文件${NC}"
    fi

    # 检查写入权限
    if [ -w "$FORM_DIR" ]; then
        echo -e "${GREEN}   ✅ 目录可写${NC}"
    else
        echo -e "${RED}   ❌ 目录不可写${NC}"
        echo "   执行命令修复: chmod 755 $FORM_DIR"
    fi
else
    echo -e "${RED}❌ 表单目录不存在: $FORM_DIR${NC}"
    echo "   执行命令创建: mkdir -p $FORM_DIR && chmod 755 $FORM_DIR"
fi
echo ""

# 4. 检查nginx配置
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  检查nginx配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ nginx 已安装${NC}"

    # 测试配置
    if sudo nginx -t 2>/dev/null; then
        echo -e "${GREEN}✅ nginx配置文件语法正确${NC}"
    else
        echo -e "${RED}❌ nginx配置文件有错误${NC}"
        echo "   执行命令查看详情: sudo nginx -t"
    fi

    # 检查是否在运行
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ nginx 正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️  nginx 未运行${NC}"
        echo "   执行命令启动: sudo systemctl start nginx"
    fi
else
    echo -e "${YELLOW}⚠️  nginx 未安装或不在PATH中${NC}"
fi
echo ""

# 5. 检查后端健康接口
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  测试后端健康接口"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEALTH_CHECK=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 后端健康检查通过${NC}"
    echo "   响应: $HEALTH_CHECK"
else
    echo -e "${RED}❌ 后端健康检查失败${NC}"
    echo "   请确认后端服务正常运行"
fi
echo ""

# 6. 检查表单下载路由
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  测试表单下载路由"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 注意：这个测试需要JWT token，仅测试路由是否可达
ROUTE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/forms/download/test.docx 2>/dev/null)
if [ "$ROUTE_CHECK" = "401" ] || [ "$ROUTE_CHECK" = "404" ]; then
    echo -e "${GREEN}✅ 表单下载路由可达 (状态码: $ROUTE_CHECK)${NC}"
    echo "   401表示需要认证（正常），404表示文件不存在（正常）"
elif [ "$ROUTE_CHECK" = "000" ]; then
    echo -e "${RED}❌ 无法连接到表单下载路由${NC}"
else
    echo -e "${YELLOW}⚠️  表单下载路由返回: $ROUTE_CHECK${NC}"
fi
echo ""

# 7. 环境检查
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  环境信息"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Node.js版本: $(node -v 2>/dev/null || echo '未安装')"
echo "npm版本: $(npm -v 2>/dev/null || echo '未安装')"
echo "系统: $(uname -s)"
echo "内核: $(uname -r)"
echo ""

# 8. 建议
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 修复建议"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "$FORM_DIR" ]; then
    echo -e "${YELLOW}1. 创建表单目录:${NC}"
    echo "   mkdir -p $FORM_DIR"
    echo "   chmod 755 $FORM_DIR"
    echo ""
fi

echo -e "${YELLOW}2. 检查nginx配置，确保包含以下内容:${NC}"
echo "   location /api/ {"
echo "       proxy_pass http://localhost:3000;"
echo "       ...其他配置..."
echo "   }"
echo ""

echo -e "${YELLOW}3. 重启服务:${NC}"
echo "   sudo systemctl reload nginx"
echo "   pm2 restart all  # 或 npm start"
echo ""

echo -e "${YELLOW}4. 查看日志:${NC}"
echo "   后端日志: tail -f backend/logs/*.log"
echo "   nginx日志: tail -f /var/log/nginx/error.log"
echo ""

echo "========================================="
echo "✨ 诊断完成！"
echo "========================================="
echo ""
echo "如果问题仍未解决，请查看详细文档:"
echo "📄 FORM_DOWNLOAD_FIX_GUIDE.md"
echo ""
