# 教育系统智能体 - 后台管理系统

## 项目概述

这是一个用于管理教育系统智能体的后台管理系统，支持数据管理、文件上传、知识库管理等功能。

## 功能特性

- 📊 数据库数据管理 - 支持通过前端界面直接修改数据库数据
- 📁 知识库文件上传 - 支持上传新文件作为增量知识库
- 🔍 向量化检索集成 - 自动提取向量并整合到现有检索系统
- 🔄 增量更新机制 - 避免全量导入，确保数据一致性
- 🤖 智能体交互 - 与智能体系统产生实时交互

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- shadcn/ui UI组件库
- TailwindCSS 样式框架
- React Query 数据管理

### 后端
- Node.js + Express
- TypeScript
- SQLite 数据库
- Multer 文件上传
- 向量检索集成

## 项目结构

```
后台管理系统/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── pages/       # 页面
│   │   ├── services/    # API服务
│   │   └── types/       # 类型定义
│   └── package.json
├── backend/           # 后端项目
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── routes/       # 路由
│   │   ├── services/     # 业务逻辑
│   │   └── types/        # 类型定义
│   └── package.json
└── shared/            # 共享类型定义
    └── types/
```

## 快速开始

### 安装依赖

```bash
# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd backend && npm install
```

### 启动开发服务器

```bash
# 启动前端 (端口: 5173)
cd frontend && npm run dev

# 启动后端 (端口: 3001)
cd backend && npm run dev
```

## 开发指南

详细的开发指南请参考各子项目的README文件。

## 许可证

MIT
