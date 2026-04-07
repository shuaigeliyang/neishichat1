# 表单下载功能修复指南

> 作者：内师智能体系统 (￣▽￣)ﾉ
> 创建日期：2026-03-30

## 问题诊断

部署到服务器后，表单下载功能不可用。本小姐已经分析了代码，发现以下几个可能的问题：

### 问题1：nginx 反向代理配置问题 ⚠️

**症状：** 前端可以生成表单，但点击下载按钮时失败

**原因：** nginx 可能没有正确配置 `/api/forms/download/` 路径的代理转发

### 问题2：文件权限问题 🔐

**症状：** 生成表单时报错，或文件无法读取

**原因：** `backend/exports/forms/` 目录没有正确的读写权限

### 问题3：响应头配置问题 📋

**症状：** 浏览器阻止下载（CORS 或 Content-Disposition 错误）

**原因：** 响应头没有正确设置

---

## 解决方案

### 方案1：nginx 配置修复（推荐！）

如果你使用 nginx 反向代理，需要确保正确配置：

```nginx
# nginx 配置文件位置：/etc/nginx/sites-available/your-site

server {
    listen 80;
    server_name 47.108.233.194;  # 你的服务器IP或域名

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;  # 前端构建目录
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3000;  # 后端地址
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # ⚠️ 重要：允许大文件下载
        proxy_max_temp_file_size 0;
        proxy_buffering off;
    }

    # ⚠️ 特别处理：表单下载路径
    location /api/forms/download/ {
        proxy_pass http://localhost:3000/api/forms/download/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 重要：下载文件需要这些配置
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

**更新配置后，重启 nginx：**
```bash
sudo nginx -t              # 测试配置文件
sudo systemctl reload nginx # 重启nginx
```

---

### 方案2：检查文件权限

登录服务器，执行以下命令：

```bash
# 进入后端目录
cd /path/to/backend

# 确保exports/forms目录存在且有写权限
mkdir -p exports/forms
chmod 755 exports/forms

# 检查当前权限
ls -la exports/forms
```

如果权限不正确，修复权限：
```bash
# 设置所有者（根据你的服务器用户）
sudo chown -R $USER:$USER exports/forms
chmod -R 755 exports/forms
```

---

### 方案3：后端代码优化

如果上述方案无效，可以优化后端的下载接口：

#### 3.1 检查 backend/src/routes/forms.js

确保下载接口正确配置：

```javascript
// 下载接口应该在 forms.js 中已经存在
router.get('/download/:fileName', authenticate, async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../../exports/forms', fileName);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return error(res, '文件不存在', 404);
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // 发送文件
    res.sendFile(filePath);

  } catch (err) {
    console.error('❌ 下载表单失败:', err);
    error(res, '下载表单失败', 500);
  }
});
```

#### 3.2 添加 helmet 配置豁免（如果使用 helmet）

如果后端使用了 helmet 安全中间件，可能需要配置豁免下载路径：

编辑 `backend/src/app.js`：

```javascript
const helmet = require('helmet');

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false  // 如果下载被CSP阻止，可以暂时禁用
}));
```

---

### 方案4：前端配置修复（如果使用 Vite 代理）

如果你在本地开发或使用 Vite 的代理功能，检查 `frontend/vite.config.js`：

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

**注意：** 生产环境（服务器部署）应该使用 nginx 反向代理，而不是 Vite 代理！

---

## 诊断工具

### 测试脚本

创建一个测试脚本来验证下载功能是否正常：

```bash
#!/bin/bash
# test-form-download.sh

echo "🔍 测试表单下载功能..."

# 1. 测试后端是否运行
echo "1. 检查后端服务..."
curl -s http://localhost:3000/health && echo "✅ 后端正常运行" || echo "❌ 后端未运行"

# 2. 测试表单生成接口（需要token）
echo "2. 测试表单生成接口..."
# 这里需要你的JWT token
# TOKEN="your-jwt-token-here"
# curl -X POST http://localhost:3000/api/forms/generate \
#   -H "Authorization: Bearer $TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{"templateName":"竞赛申请表"}'

# 3. 检查文件目录
echo "3. 检查表单文件目录..."
ls -lh backend/exports/forms/ && echo "✅ 文件目录正常" || echo "❌ 文件目录不存在"

# 4. 检查nginx配置
echo "4. 检查nginx配置..."
sudo nginx -t && echo "✅ nginx配置正常" || echo "❌ nginx配置有误"

echo "✨ 诊断完成！"
```

---

## 快速修复步骤（按顺序执行）

### 步骤1：检查后端服务

```bash
# SSH登录服务器
ssh user@47.108.233.194

# 检查后端是否在运行
pm2 status
# 或者
ps aux | grep node

# 如果没有运行，启动后端
cd /path/to/backend
npm start
# 或者使用pm2
pm2 start src/app.js --name education-backend
```

### 步骤2：检查文件权限

```bash
cd /path/to/backend
mkdir -p exports/forms
chmod 755 exports/forms
```

### 步骤3：检查nginx配置

```bash
# 编辑nginx配置
sudo nano /etc/nginx/sites-available/your-site

# 添加/修改配置（参考方案1）

# 测试并重启
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤4：重启服务

```bash
# 重启后端
pm2 restart education-backend
# 或
systemctl restart education-backend

# 重启nginx
sudo systemctl reload nginx
```

---

## 验证修复

修复完成后，测试以下内容：

1. **打开浏览器开发者工具** (F12)
2. **切换到 Network 标签**
3. **尝试下载表单**
4. **检查请求状态：**
   - 如果状态码是 200 → 成功！✅
   - 如果状态码是 404 → 路径配置问题
   - 如果状态码是 403 → 权限问题
   - 如果状态码是 500 → 后端代码问题

---

## 常见错误及解决方案

### 错误1：404 Not Found

**原因：** nginx 没有正确代理 `/api/forms/download/` 路径

**解决：** 按照方案1配置 nginx

### 错误2：403 Forbidden

**原因：** 文件权限不足

**解决：** 按照方案2修复权限

### 错误3：CORS 错误

**原因：** 跨域配置问题

**解决：** 检查 `backend/.env` 中的 `CORS_ORIGIN` 配置，或修改 nginx 添加 CORS 头

### 错误4：文件下载为0字节

**原因：** 文件生成失败或路径错误

**解决：** 检查后端日志，确认文件确实已生成

---

## 联系与支持

如果以上方案都无法解决问题，请提供以下信息：

1. 浏览器控制台的错误截图
2. 后端日志 (`backend/logs/` 目录)
3. nginx 错误日志 (`/var/log/nginx/error.log`)
4. 服务器环境信息（操作系统、Node.js版本等）

---

## 附录：完整nginx配置示例

```nginx
# /etc/nginx/sites-available/education-system

server {
    listen 80;
    server_name 47.108.233.194;

    # 日志
    access_log /var/log/nginx/education-access.log;
    error_log /var/log/nginx/education-error.log;

    # 前端
    location / {
        root /var/www/education-system/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
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
    }

    # 静态文件（如果需要）
    location /exports/ {
        alias /path/to/backend/exports/;
        autoindex off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

**文档版本：** 1.0
**最后更新：** 2026-03-30
**作者：** 内师智能体系统 (￣▽￣)ﾉ

哼，跟着本小姐的步骤走，一定能解决问题！(￣ω￣)ﾉ
