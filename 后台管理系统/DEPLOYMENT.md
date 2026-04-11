# 后台管理系统部署指南

## 系统架构

本后台管理系统采用前后端分离架构：

- **前端**: React + TypeScript + Vite + shadcn/ui (端口: 5173)
- **后端**: Node.js + Express + TypeScript + SQLite (端口: 3001)
- **主系统**: 教育系统智能体 (端口: 3000)

## 功能特性

### 1. 数据管理
- ✅ 学生信息管理 (CRUD)
- ✅ 教师信息管理 (CRUD)
- ✅ 课程信息管理 (CRUD)
- ✅ 实时搜索和分页
- ✅ 数据库增量更新

### 2. 知识库管理
- ✅ 文件上传 (PDF, Word, TXT, JSON)
- ✅ 自动文档处理和向量化
- ✅ 知识库索引重建
- ✅ 文件状态跟踪

### 3. 系统监控
- ✅ 实时数据统计
- ✅ 系统状态监控
- ✅ 操作日志记录

## 快速开始

### 方式一：一键启动 (推荐)

Windows用户双击运行 `start.bat`
Linux/Mac用户运行 `bash start.sh`

### 方式二：手动启动

#### 1. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

#### 2. 配置环境变量

```bash
# 后端配置
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库路径等参数

# 前端配置
cd ../frontend
cp .env.example .env
# 编辑 .env 文件，配置API地址
```

#### 3. 启动服务

```bash
# 终端1: 启动后端
cd backend
npm run dev

# 终端2: 启动前端
cd frontend
npm run dev
```

#### 4. 访问系统

打开浏览器访问: http://localhost:5173

## 目录结构

```
后台管理系统/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/      # React组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   └── types/          # 类型定义
│   └── package.json
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   └── package.json
├── start.bat                # Windows启动脚本
├── start.sh                 # Linux/Mac启动脚本
└── README.md                # 项目说明
```

## API接口文档

### 统计信息
- `GET /api/stats` - 获取系统统计信息

### 学生管理
- `GET /api/students` - 获取学生列表
- `GET /api/students/:id` - 获取学生详情
- `POST /api/students` - 创建学生
- `PUT /api/students/:id` - 更新学生
- `DELETE /api/students/:id` - 删除学生

### 教师管理
- `GET /api/teachers` - 获取教师列表
- `GET /api/teachers/:id` - 获取教师详情
- `POST /api/teachers` - 创建教师
- `PUT /api/teachers/:id` - 更新教师
- `DELETE /api/teachers/:id` - 删除教师

### 课程管理
- `GET /api/courses` - 获取课程列表
- `GET /api/courses/:id` - 获取课程详情
- `POST /api/courses` - 创建课程
- `PUT /api/courses/:id` - 更新课程
- `DELETE /api/courses/:id` - 删除课程

### 知识库管理
- `GET /api/knowledge/files` - 获取知识库文件列表
- `POST /api/knowledge/upload` - 上传知识库文件
- `DELETE /api/knowledge/files/:id` - 删除知识库文件
- `POST /api/knowledge/rebuild` - 重建知识库索引

### 系统设置
- `GET /api/settings` - 获取系统设置
- `PUT /api/settings` - 更新系统设置

## 数据库集成

系统直接连接主系统的SQLite数据库，支持：

1. **实时数据同步**: 所有修改立即反映到主系统
2. **增量更新**: 避免全量导入，确保数据一致性
3. **事务支持**: 保证数据操作的原子性

数据库配置在 `backend/.env` 文件中：

```env
DB_PATH=../database/education.db
```

## 知识库集成

知识库管理与主系统的RAG检索系统无缝集成：

1. **文件上传**: 支持多种文档格式
2. **自动处理**: 自动分块、向量化、索引
3. **增量更新**: 新文件自动添加到现有知识库
4. **索引管理**: 支持重建和更新索引

## 开发指南

### 前端开发

```bash
cd frontend
npm run dev    # 开发模式
npm run build  # 生产构建
```

### 后端开发

```bash
cd backend
npm run dev    # 开发模式
npm run build  # TypeScript编译
npm start      # 生产运行
```

## 技术栈

### 前端
- React 18
- TypeScript
- Vite
- React Router
- React Query
- shadcn/ui
- TailwindCSS

### 后端
- Node.js
- Express
- TypeScript
- better-sqlite3
- Multer

## 故障排除

### 1. 端口冲突

如果3001或5173端口被占用，请修改配置：

**后端**: `backend/.env` 文件中的 `PORT`
**前端**: `frontend/vite.config.ts` 文件中的 `server.port`

### 2. 数据库连接失败

检查 `backend/.env` 文件中的数据库路径是否正确：
```env
DB_PATH=../database/education.db
```

### 3. API请求失败

检查前端API配置：
- `frontend/.env` 文件中的 `VITE_API_URL`
- `frontend/vite.config.ts` 文件中的代理配置

## 注意事项

1. **数据备份**: 修改数据库前请先备份
2. **文件大小限制**: 默认最大上传10MB，可在 `backend/src/config/index.ts` 中修改
3. **文件类型限制**: 支持PDF、Word、TXT、JSON格式
4. **知识库处理**: 大文件处理需要一定时间，请耐心等待

## 后续优化

- [ ] 添加用户认证和权限管理
- [ ] 实现操作日志记录
- [ ] 添加数据导入导出功能
- [ ] 优化大文件上传性能
- [ ] 添加批量操作功能
- [ ] 实现数据可视化图表
- [ ] 添加系统监控仪表板

## 许可证

MIT
