# 学生教育系统智能体

> 一个基于AI的智能学生信息管理系统，由**内师智能体系统**倾情打造！(￣▽￣)ﾉ

## 🎯 项目简介

这是一个集成了智谱AI大模型的学生教育管理系统，学生和教师可以通过自然语言对话的方式查询个人信息、成绩、课程表等，管理员可以维护管理办法和表格下载资源。

### ✨ 核心特性

- 🤖 **AI智能对话** - 集成智谱AI大模型，自然语言交互
- 👨‍🎓 **学生管理** - 完整的学生信息、成绩、课程管理
- 👨‍🏫 **教师管理** - 教师授课信息、班级学生管理
- 📚 **管理办法** - 支持版本控制的管理办法查询系统
- 📄 **表格下载** - 各类申请表、证明表下载功能
- 🎨 **精美界面** - 现代化的渐变色UI设计
- 🔐 **权限控制** - 学生、教师、管理员三级权限体系

## 🛠 技术栈

### 后端
- **Node.js** + **Express** - 服务器框架
- **MySQL** - 数据库
- **JWT** - 身份认证
- **智谱AI API** - 大语言模型
- **Winston** - 日志管理
- **Bcrypt** - 密码加密

### 前端
- **React 18** - UI框架
- **Vite** - 构建工具
- **Ant Design** - UI组件库
- **React Router** - 路由管理
- **Axios** - HTTP客户端

## 📦 安装部署

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- npm >= 8.0.0

### 1. 克隆项目

```bash
cd education-system
```

### 2. 数据库配置

创建MySQL数据库并导入表结构：

```bash
cd backend
npm install

# 配置 .env 文件（数据库密码等）
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息

# 初始化数据库
npm run init-db

# 生成测试数据
node scripts/generateTestData.js
```

### 3. 启动后端服务

```bash
cd backend
npm install
npm run dev
```

后端服务将在 `http://localhost:3000` 启动

### 4. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 `http://localhost:5173` 启动

## 🚀 使用说明

### 默认账号

系统已预置测试数据，可以使用以下账号登录：

| 用户类型 | 用户名 | 密码 | 说明 |
|---------|--------|------|------|
| 学生 | S230101001 ~ S240630030 | 123456 | 测试学生账号 |
| 教师 | T01001 ~ T05100 | 123456 | 测试教师账号 |
| 管理员 | admin | admin123 | 系统管理员 |

### 功能演示

#### 学生端
- 登录后查看个人信息、成绩、课程表
- 使用智能助手查询："我的成绩"、"课程表"、"个人信息"等
- 查看和下载各类表格

#### 教师端
- 查看个人授课信息
- 查看班级学生列表
- 使用智能助手辅助工作

#### 管理员
- 查看系统统计数据
- 管理办法（支持版本更新）
- 管理可下载表格
- 查看对话历史记录

## 📁 项目结构

```
education-system/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── middlewares/    # 中间件
│   │   ├── routes/         # 路由
│   │   ├── services/       # 服务层
│   │   ├── utils/          # 工具函数
│   │   └── app.js          # 入口文件
│   ├── scripts/            # 脚本文件
│   ├── database/           # 数据库SQL
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── App.jsx        # 主应用
│   │   └── main.jsx       # 入口文件
│   └── package.json
└── README.md
```

## 🔧 API文档

### 认证接口

- `POST /api/auth/login` - 用户登录
- `PUT /api/auth/change-password` - 修改密码

### 学生接口

- `GET /api/students/profile` - 获取个人信息
- `GET /api/students/grades` - 获取成绩
- `GET /api/students/timetable` - 获取课程表

### 教师接口

- `GET /api/teachers/profile` - 获取个人信息
- `GET /api/teachers/courses` - 获取授课课程
- `GET /api/teachers/class-students` - 获取班级学生

### AI对话接口

- `POST /api/chat` - AI对话
- `GET /api/chat/history` - 对话历史

### 管理员接口

- `GET /api/admin/statistics` - 系统统计
- `POST /api/admin/regulations` - 添加管理办法
- `PUT /api/admin/regulations/:id` - 更新管理办法
- `POST /api/admin/forms` - 添加表格
- `GET /api/admin/chat-history` - 对话历史

## 🎨 界面预览

### 登录页面
渐变色背景 + 毛玻璃效果的现代化登录界面

### 智能对话
- 实时AI对话交互
- 支持Markdown格式
- 历史记录查询

### 数据仪表板
- 统计卡片展示
- 表格数据展示
- 响应式布局

## 📊 数据库设计

系统包含16个核心数据表：

1. **colleges** - 学院信息
2. **majors** - 专业信息
3. **classes** - 班级信息
4. **students** - 学生信息
5. **teachers** - 教师信息
6. **courses** - 课程信息
7. **course_offerings** - 开课计划
8. **grades** - 成绩信息
9. **regulations** - 管理办法（支持版本控制）
10. **downloadable_forms** - 可下载表格
11. **user_roles** - 用户角色
12. **user_role_relations** - 用户角色关联
13. **chat_history** - 对话历史
14. **faq** - 常见问题
15. **announcements** - 通知公告
16. **system_logs** - 系统日志

详细的表结构请查看 `database/schema.sql`

## 🔐 安全特性

- ✅ JWT身份认证
- ✅ 密码bcrypt加密
- ✅ 请求速率限制
- ✅ SQL注入防护
- ✅ XSS防护
- ✅ CORS配置

## 🌟 未来规划

- [ ] 更多AI功能（成绩分析、学习建议等）
- [ ] 移动端适配优化
- [ ] 实时通知推送
- [ ] 数据可视化大屏
- [ ] 微信小程序版本

## 👨‍💻 作者

**内师智能体系统** (￣▽￣)ﾉ

> 内师智能体系统，专业AI教育助手！

## 📄 许可证

MIT License

## 🙏 致谢

- 智谱AI提供的大语言模型API
- Ant Design优秀的UI组件库
- 开源社区的贡献

---

**本小姐的作品当然要完美无缺！** ( ` ω´ )b

如有问题，欢迎联系本小姐的笨蛋助手～
