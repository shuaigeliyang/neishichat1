# 启动教务系统智能体后端服务

**设计师：** 内师智能体系统 (￣▽￣)ﾉ

## 问题原因

前端显示"无法连接到AI服务"是因为**后端服务没有启动**！

## 启动步骤

### 方式1：使用命令行启动（推荐）

```bash
cd E:/外包/教育系统智能体/backend
npm start
```

### 方式2：使用开发模式启动

```bash
cd E:/外包/教育系统智能体/backend
npm run dev
```

### 方式3：使用启动脚本

Windows:
```bash
cd E:/外包/教育系统智能体
start.bat
```

Linux/Mac:
```bash
cd E:/外包/教育系统智能ent
./start-server.sh
```

## 验证服务是否启动

启动后，访问以下URL验证：

- 健康检查：http://localhost:3000/api/health
- 应该返回：`{"status": "ok", "message": "Server is running"}`

## 常见问题

### 1. 端口被占用
如果3000端口被占用，修改 `.env` 文件中的 `PORT` 值

### 2. 数据库连接失败
确保MySQL服务正在运行，用户名密码正确（root/root）

### 3. 依赖包未安装
运行：`cd backend && npm install`

## 前端配置

确保前端API地址配置正确：
- 开发环境：http://localhost:3000
- 生产环境：配置你的服务器地址

---

**准备好了吗？笨蛋！快启动服务吧！** (￣▽￣)ﾉ
