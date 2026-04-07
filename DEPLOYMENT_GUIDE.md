# 教育系统智能体 - 部署说明文档

> 作者：内师智能体系统 (￣▽￣)ﾉ
> 版本：v1.0 - 第一阶段（13个表单可下载）
> 日期：2026-03-30
> 部署目标：生产环境

---

## 📦 部署包内容

### database/ ⭐ 重要！
```
database/
├── education_system_complete.sql    # 完整数据库（295 KB）
├── import-database.bat               # Windows一键导入
├── import-database.sh                # Linux/Mac一键导入
└── DATABASE_IMPORT_GUIDE.md         # 导入指南 ⭐ 必读
```

### backend/
```
backend/
├── src/                              # 源代码
├── package.json                       # 依赖配置
├── .env                              # 环境配置 ⭐ 需要修改
└── exports/forms/                    # 表单生成目录
```

### frontend/
```
frontend/
├── src/                              # 源代码
├── dist/                             # 构建产物（如已构建）
└── package.json                       # 依赖配置
```

---

## 🚀 快速部署指南

### 第一步：数据库导入 ⭐

**Windows 用户：**
```bash
cd database
import-database.bat
```

**Linux/Mac 用户：**
```bash
cd database
chmod +x import-database.sh
./import-database.sh
```

**验证数据库：**
```bash
mysql -u root -p
USE education_system;
SHOW TABLES;
SELECT COUNT(*) FROM form_templates;  # 应该返回13
```

详细说明请查看 `database/DATABASE_IMPORT_GUIDE.md`

---

### 第二步：后端部署

#### 2.1 安装依赖

```bash
cd backend
npm install
```

#### 2.2 配置环境变量

编辑 `backend/.env` 文件：

```env
# 服务器配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置 ⭐ 修改这里
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password    # 改为你的MySQL密码
DB_NAME=education_system

# JWT配置
JWT_SECRET=请修改为随机字符串_至少32位
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=*

# 智谱AI配置
ZHIPU_API_KEY=你的API密钥

# 其他配置...
```

#### 2.3 启动后端服务

**开发模式：**
```bash
npm start
```

**生产模式（使用PM2）：**
```bash
# 安装PM2（全局）
npm install -g pm2

# 启动服务
pm2 start src/app.js --name education-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs education-backend

# 设置开机自启
pm2 startup
pm2 save
```

---

### 第三步：前端部署

#### 3.1 安装依赖

```bash
cd frontend
npm install
```

#### 3.2 构建前端

```bash
npm run build
```

#### 3.3 配置Nginx

创建 nginx 配置文件 `/etc/nginx/sites-available/education-system`：

```nginx
server {
    listen 80;
    server_name 47.108.233.194;  # 修改为你的域名或IP

    # 日志
    access_log /var/log/nginx/education-access.log;
    error_log /var/log/nginx/education-error.log;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;  # 修改为实际路径
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
```

**启用配置：**
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/education-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启nginx
sudo systemctl reload nginx
```

---

## 🔍 部署验证

### 1. 后端验证

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试表单列表
curl http://localhost:3000/api/forms
```

**预期结果：**
```json
{
  "success": true,
  "message": "服务运行正常"
}
```

### 2. 前端验证

打开浏览器访问：`http://47.108.233.194`

**检查项：**
- ✅ 页面能正常打开
- ✅ 可以登录系统
- ✅ 输入"表单下载"能看到13个表单
- ✅ 点击下载能正常下载Word文档

### 3. 表单功能测试

**测试表单下载：**
1. 登录系统（学生账号：S2201001 / 123456）
2. 在聊天框输入"表单下载"
3. 选择任意表单下载
4. 验证下载的Word文档能正常打开

---

## 🛠️ 常见问题解决

### 问题1：后端服务无法启动

**错误信息：** `ECONNREFUSED`

**解决：**
```bash
# 检查端口占用
netstat -ano | findstr :3000

# 检查后端日志
cd backend
npm start
```

### 问题2：数据库连接失败

**错误信息：** `Access denied`

**解决：**
```bash
# 检查数据库配置
cat backend/.env | grep DB_

# 测试数据库连接
mysql -u root -p education_system
```

### 问题3：表单下载404

**错误信息：** `404 Not Found`

**解决：**
参考 `FORM_DOWNLOAD_FIX_GUIDE.md` 修复nginx配置

### 问题4：表单列表显示undefined

**解决：**
```bash
cd backend
node update-forms-phase1.js
pm2 restart all
```

---

## 📊 功能清单

### 已实现功能（第一阶段）

#### 表单下载（13个）✨
- ✅ 学科竞赛参赛申请表
- ✅ 转专业申请表
- ✅ 奖学金申请表
- ✅ 休学申请表
- ✅ 复学申请表（新增）
- ✅ 请假申请表（新增）
- ✅ 贫困生认定申请表（新增）
- ✅ 助学金申请表（新增）
- ✅ 助学贷款申请表（新增）
- ✅ 成绩证明申请表（新增）
- ✅ 在读证明申请表（新增）
- ✅ 毕业证明申请表（新增）
- ✅ 学位证明申请表（新增）

#### 智能问答
- ✅ 学生信息查询
- ✅ 成绩查询
- ✅ 课程查询
- ✅ 学生手册问答

#### RAG文档检索
- ✅ 学生手册检索
- ✅ 管理办法查询

---

## 🔧 性能优化建议

### 1. 启用Gzip压缩

在nginx配置中添加：
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 2. 配置静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 启用PM2集群模式

```bash
pm2 start src/app.js -i max --name education-backend
```

---

## 📝 维护指南

### 日志查看

```bash
# PM2日志
pm2 logs education-backend

# Nginx日志
tail -f /var/log/nginx/education-access.log
tail -f /var/log/nginx/education-error.log

# 后端应用日志
tail -f backend/logs/combined.log
```

### 数据库备份

```bash
# 手动备份
mysqldump -u root -p education_system > backup_$(date +%Y%m%d).sql

# 恢复备份
mysql -u root -p education_system < backup_20260330.sql
```

### 服务重启

```bash
# 重启后端
pm2 restart education-backend

# 重启nginx
sudo systemctl reload nginx

# 重启全部
pm2 restart all
sudo systemctl reload nginx
```

---

## 📞 技术支持

### 部署时遇到问题

请提供以下信息：

1. **系统环境**
   - 操作系统版本
   - MySQL版本
   - Node.js版本

2. **错误信息**
   - 完整的错误堆栈
   - 错误发生的步骤

3. **配置信息**
   - backend/.env 内容（隐藏敏感信息）
   - nginx配置文件

4. **日志信息**
   - PM2日志
   - Nginx错误日志
   - 后端应用日志

---

## 📚 相关文档

### 数据库相关
- `database/DATABASE_IMPORT_GUIDE.md` - 数据库导入指南

### 表单下载相关
- `FORM_DOWNLOAD_FIX_GUIDE.md` - 表单下载问题修复指南
- `FORM_IMPLEMENTATION_GAP.md` - 表单实现不完整问题分析

### 第一阶段实现
- `PHASE1_IMPLEMENTATION_GUIDE.md` - 第一阶段实施指南
- `PHASE1_COMPLETION_REPORT.md` - 第一阶段完成报告

### 开发日志
- `WORK_LOG_2026-03-30.md` - 今天的工作日志

---

## ✨ 总结

哼，本小姐已经把一切都准备好了！(￣▽￣)ﾉ

**部署包包含：**
- ✅ 完整的数据库（295 KB，13个表单）
- ✅ 一键导入脚本（Windows/Linux）
- ✅ 详细的部署指南
- ✅ 完整的问题解决方案

**你的同学只需要：**
1. 导入数据库（运行一个脚本）
2. 配置环境变量（修改.env文件）
3. 启动服务（npm start 或 pm2 start）
4. 配置nginx（复制配置文件）

**就这么简单！** o(￣▽￣)ｄ

---

**文档版本：** 1.0
**最后更新：** 2026-03-30
**作者：** 内师智能体系统 (￣▽￣)ﾉ
**状态：** 第一阶段已完成，可以部署

哼，跟着本小姐的指南，一定能成功部署！笨蛋！(￣ω￣)ﾉ
