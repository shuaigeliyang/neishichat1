# 教育系统智能体 - 完整部署指南

> **设计师：哈雷酱 (￣▽￣)／**
> **版本：v2.0 - 2026年4月**
> **适用于：对项目完全不了解的新手**

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [环境准备](#3-环境准备)
4. [Python Embedding服务部署（端口5001）](#4-python-embedding服务部署端口5001)
5. [后台服务部署（端口3005）](#5-后台服务部署端口3005)
6. [前台服务部署（端口3000）](#6-前台服务部署端口3000)
7. [前台前端部署（端口5173）](#7-前台前端部署端口5173)
8. [数据库配置](#8-数据库配置)
9. [一键启动脚本](#9-一键启动脚本)
10. [验证测试](#10-验证测试)
11. [常见问题排查](#11-常见问题排查)

---

## 1. 项目概述

### 1.1 项目简介

本项目是一个**教育系统智能助手**，支持：
- 📚 **政策文档问答**：基于RAG（检索增强生成）技术回答学生关于学校政策的问题
- 🗄️ **数据库查询**：学生可查询自己的成绩、课表、奖学金等信息
- 📝 **表单生成**：自动生成各类申请表（奖学金申请、休学申请等）
- 🤖 **智能对话**：集成智谱AI的智能对话功能

### 1.2 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前台前端 | React + Vite | 用户界面，端口5173 |
| 前台后端 | Node.js + Express | RAG问答API，端口3000 |
| 后台前端 | React + Vite | 管理界面，端口5174 |
| 后台后端 | Node.js + Express | 文档管理API，端口3005 |
| Python服务 | Flask + sentence-transformers | 本地向量embedding，端口5001 |
| 数据库 | MySQL | 学生、成绩、课程等数据 |

### 1.3 端口分配

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | 前台RAG服务 | 前台问答API |
| 3005 | 后台管理服务 | 文档管理API |
| 5001 | Python Embedding | 本地向量服务 |
| 5173 | 前台前端 | 用户界面 |
| 5174 | 后台前端 | 管理界面 |

### 1.4 目录结构

```
教育系统智能体/
├── backend/                    # 前台后端（RAG服务，端口3000）
│   ├── src/
│   │   ├── routes/           # API路由
│   │   │   ├── ragV2.js     # RAG问答API
│   │   │   └── chat.js      # 聊天API
│   │   └── services/
│   │       ├── multiDocumentRagService.js  # 多文档RAG服务
│   │       └── hybridSearch.js             # 混合搜索
│   ├── pythonEmbeddingClient.js
│   ├── local_embedding_service.py
│   └── package.json
├── frontend/                  # 前台前端（用户界面，端口5173）
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Chat.jsx     # 聊天页面
│   │   │   └── PolicyDocuments.jsx  # 文档管理页面
│   │   └── utils/
│   │       └── intentDetector.js  # 意图识别
│   └── package.json
├── 后台管理系统/
│   ├── backend/              # 后台后端（文档管理，端口3005）
│   │   └── src/
│   │       ├── routes/      # API路由
│   │       └── services/
│   │           ├── unifiedIndexManager.js   # 统一索引管理
│   │           ├── incrementalPipeline.js   # 文档处理流水线
│   │           └── pythonEmbeddingClient.js
│   └── frontend/            # 后台前端（端口5174）
└── 文档库/                    # 共享数据目录
    ├── indexes/
    │   ├── unified_index.json      # ⭐ 统一索引文件（前台后台共享！）
    │   ├── retrieval_index.json
    │   └── embedding_cache.json
    ├── config.json                # ⭐ 配置文件
    └── documents/                 # 文档存储
```

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   前台界面(5173) │              │  后台界面(5174)   │        │
│  │  - 学生/教师聊天  │              │  - 文档管理       │        │
│  │  - 政策问答      │              │  - 文档上传处理   │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
└───────────┼─────────────────────────────────┼───────────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│   前台服务(3000)       │         │   后台服务(3005)       │
│   - RAG问答API        │         │   - 文档管理API       │
│   - 多文档检索        │         │   - 文档处理流水线     │
└───────────┬───────────┘         └───────────┬───────────┘
            │                                 │
            │      ┌─────────────────────┐    │
            │      │  Python服务(5001)   │    │
            │      │  - Embedding生成   │    │
            │      │  - 本地向量检索    │    │
            │      └─────────────────────┘    │
            │                                 │
            ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     共享文件区（关键！）                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ unified_index   │  │  embedding_cache│  │  config.json│ │
│  │ .json(索引)     │  │  .json(向量缓存)│  │  (配置)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**⭐ 重要说明：**
- `unified_index.json` 是前台和后台共享的索引文件
- 后台处理文档后会自动写入这个文件
- 前台会自动检测文件变化并热更新
- `config.json` 包含所有服务的配置信息

---

## 3. 环境准备

### 3.1 必需的软件

| 软件 | 版本要求 | 下载地址 |
|------|---------|---------|
| Node.js | >= 18.0.0 | https://nodejs.org/ |
| Python | >= 3.9 | https://www.python.org/ |
| Git | 最新版 | https://git-scm.com/ |
| MySQL | >= 8.0 | https://dev.mysql.com/downloads/mysql/ |

### 3.2 安装步骤

#### 3.2.1 安装 Node.js

1. 访问 https://nodejs.org/ 下载最新LTS版本
2. 运行安装程序，**勾选"Add to PATH"**
3. 验证安装：
```bash
node -v    # 应显示 v18.x.x 或更高
npm -v     # 应显示 9.x.x 或更高
```

#### 3.2.2 安装 Python

1. 访问 https://www.python.org/downloads/ 下载最新版本
2. 运行安装程序，**必须勾选"Add Python to PATH"**
3. 验证安装：
```bash
python --version    # 应显示 Python 3.9.x 或更高
pip --version      # 应显示版本号
```

#### 3.2.3 克隆或获取项目

```bash
# 方式1：从GitHub克隆（如果有仓库）
git clone <项目仓库地址> 教育系统智能体

# 方式2：复制项目文件夹到本地
# 直接将整个项目文件夹复制到你的电脑
```

### 3.3 创建Python虚拟环境（强烈推荐）

```bash
# 进入项目根目录
cd 教育系统智能体

# 创建虚拟环境（隔离项目依赖）
python -m venv .venv

# 激活虚拟环境
# Windows PowerShell:
.venv\Scripts\activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

# 验证激活成功（命令行前应显示 (.venv)）
```

---

## 4. Python Embedding服务部署（端口5001）

### 4.1 为什么需要这个服务？

Python Embedding服务负责：
- 将文本转换为向量（Embedding）
- 用于RAG系统的语义检索
- **完全本地运行，无需API Key，完全免费！**

### 4.2 安装Python依赖

```bash
# 确保激活了虚拟环境（重要！）
# 命令行前应显示 (.venv)

# 安装依赖包
pip install flask flask-cors sentence-transformers numpy

# 验证安装成功
python -c "import flask, sentence_transformers; print('✅ 安装成功')"
```

### 4.3 启动Embedding服务

```bash
# 进入项目根目录
cd 教育系统智能体

# 激活虚拟环境（如果还没激活）
# Windows:
.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

# 启动服务
python backend\local_embedding_service.py
```

**⚠️ 首次启动会下载模型（约400MB），请耐心等待！**

成功启动后应看到：
```
[INFO] 正在加载模型: paraphrase-multilingual-MiniLM-L12-v2
这可能需要几分钟，请耐心等待...
[OK] 模型加载完成！
   向量维度: 384
 * Running on http://127.0.0.1:5001
 * Running on http://10.x.x.x:5001
```

### 4.4 验证服务运行

**保持Embedding服务运行，新开一个终端窗口测试：**

```bash
# 健康检查
curl http://localhost:5001/health

# 预期输出：
# {"cache_size":296,"model":"paraphrase-multilingual-MiniLM-L12-v2","service":"Local Embedding Service (Python)","status":"ok"}

# 测试embedding生成
curl -X POST http://localhost:5001/embed -H "Content-Type: application/json" -d "{\"text\":\"Hello\"}"

# 预期输出：包含384维向量的JSON
```

**如果看到错误，请参考"常见问题排查"章节。**

---

## 5. 后台服务部署（端口3005）

后台服务负责文档管理、文档上传和处理。

### 5.1 安装后台后端依赖

```bash
# 新开一个终端窗口
cd 教育系统智能体/后台管理系统/backend

# 安装依赖
npm install

# 等待安装完成
```

### 5.2 配置数据库连接

1. 打开文件 `../../文档库/config.json`（或项目根目录下的 `文档库/config.json`）
2. 找到 `database` 部分，修改为你的MySQL信息：

```json
{
  "database": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "你的MySQL密码",
    "database": "education_assistant"
  }
}
```

**⚠️ 重要：如果项目路径不是 `E:/外包/教育系统智能体`，需要修改所有 `paths` 中的路径！**

### 5.3 启动后台后端服务

```bash
# 启动开发服务器（会自动监视文件变化并重启）
npm run dev
```

成功启动后应看到：
```
🚀 服务已启动: http://localhost:3005
📚 API文档: http://localhost:3005/api
```

### 5.4 安装并启动后台前端

**再新开一个终端窗口：**

```bash
cd 教育系统智能体/后台管理系统/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

成功启动后应看到：
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5174/
```

访问 http://localhost:5174/ 即可进入后台管理界面。

**默认登录账号：**
- 用户名：`admin`
- 密码：`admin123`

---

## 6. 前台服务部署（端口3000）

前台服务提供RAG问答API。

### 6.1 安装前台后端依赖

```bash
# 新开一个终端窗口
cd 教育系统智能体/backend

# 安装依赖
npm install
```

### 6.2 配置

确保 `文档库/config.json` 中的路径配置正确（参考5.2节）。

### 6.3 启动前台后端服务

```bash
# 启动开发服务器
npm run dev
```

成功启动后应看到：
```
✅ RAG服务已就绪 (使用新的多文档RAG服务)
🚀 服务器运行在 http://localhost:3000
```

---

## 7. 前台前端部署（端口5173）

### 7.1 安装前端依赖

```bash
# 新开一个终端窗口
cd 教育系统智能体/frontend

# 安装依赖
npm install
```

### 7.2 启动前端开发服务器

```bash
npm run dev
```

成功启动后应看到：
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

访问 http://localhost:5173/ 即可进入前台聊天界面。

---

## 8. 数据库配置

### 8.1 创建数据库

```sql
-- 打开MySQL命令行
mysql -u root -p

-- 输入密码后执行：
CREATE DATABASE education_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE education_assistant;

-- 导入数据库结构（如果有init.sql文件）
-- SOURCE path/to/init.sql;
```

### 8.2 更新数据库配置

编辑 `文档库/config.json`，在 `database` 部分填入你的MySQL信息：

```json
"database": {
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "你的密码",
  "database": "education_assistant"
}
```

---

## 9. 一键启动脚本

### 9.1 Windows一键启动脚本

创建 `一键启动.bat` 文件：

```batch
@echo off
title 教育系统智能体 - 一键启动
color 0A

echo ========================================
echo   教育系统智能体 - 一键启动脚本
echo   设计师：哈雷酱 (￣▽￣)／
echo ========================================
echo.

:: 获取脚本所在目录
set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

:: 激活Python虚拟环境
echo [1/5] 激活虚拟环境...
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else (
    echo 警告：未找到虚拟环境，请先运行 python -m venv .venv
)

:: 启动Python Embedding服务
echo [2/5] 启动Python Embedding服务(端口5001)...
start "Python Embedding" cmd /k "python backend\local_embedding_service.py"

:: 等待服务启动
timeout /t 5

:: 启动后台服务
echo [3/5] 启动后台管理服务(端口3005)...
cd 后台管理系统\backend
start "后台服务" cmd /k "npm run dev"

:: 等待服务启动
timeout /t 5

:: 启动前台服务
echo [4/5] 启动前台RAG服务(端口3000)...
cd ..\..\backend
start "前台服务" cmd /k "npm run dev"

:: 等待服务启动
timeout /t 5

:: 启动前台前端
echo [5/5] 启动前台前端(端口5173)...
cd ..\frontend
start "前台前端" cmd /k "npm run dev"

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo   前台界面: http://localhost:5173
echo   后台界面: http://localhost:5174
echo   前台API:  http://localhost:3000
echo   后台API:  http://localhost:3005
echo   Embedding: http://localhost:5001
echo.
echo   默认账号: admin / admin123
echo ========================================
echo.
echo 按任意键关闭此窗口（服务继续在后台运行）...
pause >nul
```

### 9.2 Linux/macOS一键启动脚本

创建 `一键启动.sh` 文件：

```bash
#!/bin/bash

echo "========================================"
echo "  教育系统智能体 - 一键启动脚本"
echo "  设计师：哈雷酱 (￣▽￣)／"
echo "========================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 激活虚拟环境
echo "[1/5] 激活虚拟环境..."
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
else
    echo "警告：未找到虚拟环境，请先运行 python -m venv .venv"
fi

# 启动Python Embedding服务（后台运行）
echo "[2/5] 启动Python Embedding服务(端口5001)..."
cd backend
python local_embedding_service.py > logs/embedding.log 2>&1 &
PID_EMBEDDING=$!
echo "  PID: $PID_EMBEDDING"

sleep 5

# 启动后台服务
echo "[3/5] 启动后台管理服务(端口3005)..."
cd ../后台管理系统/backend
npm run dev > ../logs/backend.log 2>&1 &
PID_BACKEND=$!
echo "  PID: $PID_BACKEND"

sleep 5

# 启动前台服务
echo "[4/5] 启动前台RAG服务(端口3000)..."
cd ../../backend
npm run dev > logs/frontend_api.log 2>&1 &
PID_FRONTEND_API=$!
echo "  PID: $PID_FRONTEND_API"

sleep 5

# 启动前台前端
echo "[5/5] 启动前台前端(端口5173)..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
PID_FRONTEND=$!
echo "  PID: $PID_FRONTEND"

echo ""
echo "========================================"
echo "  启动完成！"
echo "========================================"
echo ""
echo "  前台界面: http://localhost:5173"
echo "  后台界面: http://localhost:5174"
echo "  前台API:  http://localhost:3000"
echo "  后台API:  http://localhost:3005"
echo "  Embedding: http://localhost:5001"
echo ""
echo "  默认账号: admin / admin123"
echo ""
echo "  所有服务PID:"
echo "    Embedding: $PID_EMBEDDING"
echo "    后台: $PID_BACKEND"
echo "    前台API: $PID_FRONTEND_API"
echo "    前台前端: $PID_FRONTEND"
echo ""
echo "  停止服务: kill $PID_EMBEDDING $PID_BACKEND $PID_FRONTEND_API $PID_FRONTEND"
echo "========================================"
```

赋予执行权限：
```bash
chmod +x 一键启动.sh
./一键启动.sh
```

---

## 10. 验证测试

### 10.1 服务健康检查

启动所有服务后，依次测试以下地址：

```bash
# 1. Python Embedding服务
curl http://localhost:5001/health
# 预期：{"status":"ok","model":"paraphrase-multilingual-MiniLM-L12-v2"...}

# 2. 后台服务API
curl http://localhost:3005/api/documents
# 预期：返回JSON格式的文档列表

# 3. 前台RAG服务API
curl http://localhost:3000/api/rag-v2/health
# 预期：{"success":true,"initialized":true...}
```

### 10.2 前台功能测试

1. 打开浏览器访问 http://localhost:5173
2. 登录（用户名：`admin`，密码：`admin123`）
3. 在聊天框输入：
   ```
   基于文档回答，实验三的实验内容摘要是什么
   ```
4. 应该看到：
   - 意图识别显示：`文档问答（用户明确要求）`
   - 使用RAG服务检索相关文档
   - 返回基于文档内容的回答

### 10.3 后台功能测试

1. 打开浏览器访问 http://localhost:5174
2. 登录（用户名：`admin`，密码：`admin123`）
3. 进入"政策文档管理"
4. 上传一个新文档（如PDF或Word）
5. 观察处理流程：
   - 提取：正在提取文档内容
   - 分块：正在进行智能分块
   - 向量化：正在生成向量（使用本地Python服务）
   - 注册：文档已成功索引到统一索引
6. 处理完成后，去前台验证文档可被检索

---

## 11. 常见问题排查

### 问题1：端口被占用

```
Error: listen EADDRINUSE :::3000
```

**解决方法：**

```bash
# Windows：查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程（替换1234为实际进程ID）
taskkill /PID 1234 /F

# macOS/Linux：
lsof -i :3000
kill -9 <PID>
```

### 问题2：Python Embedding服务启动失败

**错误1：缺少模块**
```
ModuleNotFoundError: No module named 'sentence_transformers'
```

**解决方法：**
```bash
# 确保激活了虚拟环境
pip install flask flask-cors sentence-transformers numpy
```

**错误2：端口被占用**
```
Error: listen EADDRINUSE :::5001
```

**解决方法：**
```bash
# 结束占用端口的进程
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

### 问题3：数据库连接失败

```
Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'root'
```

**解决方法：**
1. 检查 `文档库/config.json` 中的数据库密码是否正确
2. 确认MySQL服务已启动
3. 检查MySQL用户权限

### 问题4：文档上传后前台检索不到

**可能原因1：索引文件未同步**
```bash
# 检查前台服务读取的索引文件
# 应该指向：文档库/indexes/unified_index.json
```

**可能原因2：Embedding维度不匹配**
- 如果后台用不同服务生成了不同维度的embedding
- 需要重新上传文档让它用Python服务重新生成

### 问题5：意图识别不准确

**解决方法：**
编辑 `frontend/src/utils/intentDetector.js` 添加关键词：

```javascript
// 在 ragExplicitKeywords 数组中添加新关键词
const ragExplicitKeywords = [
  // 原有关键词...
  '你的新关键词',
  // 例如：
  '实验五', '实验六', '新文档'
];
```

### 问题6：前端界面空白或报错

**解决方法：**
```bash
# 1. 清除浏览器缓存
# Ctrl + Shift + Delete

# 2. 检查控制台错误
# F12 → Console

# 3. 重新安装依赖
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 问题7：npm install 失败（国内用户）

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install

# 或者使用cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### 问题8：页面显示"未登录"或401错误

**原因：** Token过期或未登录

**解决方法：**
1. 在前台或后台界面重新登录
2. 如果持续401错误，检查JWT_SECRET配置是否一致

---

## 附录

### A. 配置文件说明

#### 文档库/config.json

这是项目的核心配置文件，必须正确配置：

```json
{
  "name": "教育系统智能体知识库",
  "version": "2.0.0",
  "paths": {
    "root": "项目根目录的绝对路径",
    "documentLibrary": "文档库目录的绝对路径",
    "indexDir": "索引目录",
    "retrievalIndex": "统一索引文件路径（不要修改）",
    "embeddingCache": "向量缓存路径",
    "registry": "文档注册表路径"
  },
  "embedding": {
    "provider": "LOCAL_PYTHON",
    "model": "paraphrase-multilingual-MiniLM-L12-v2",
    "dimension": 384
  },
  "database": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "你的MySQL密码",
    "database": "education_assistant"
  }
}
```

### B. API接口快速参考

#### 前台RAG服务 (localhost:3000)

| 接口 | 方法 | 说明 | 示例 |
|------|------|------|------|
| `/api/rag-v2/answer` | POST | 文档问答 | `{"question": "问题内容"}` |
| `/api/rag-v2/documents` | GET | 获取文档列表 | - |
| `/api/rag-v2/stats` | GET | 获取统计信息 | - |
| `/api/rag-v2/health` | GET | 健康检查 | - |

#### 后台管理服务 (localhost:3005)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/documents` | GET | 获取文档列表 |
| `/api/documents/:id` | DELETE | 删除文档 |
| `/api/documents/:id/process` | POST | 处理/重建索引 |

### C. 快速检查清单

部署完成后，逐一检查：

- [ ] Python Embedding服务运行在端口5001
- [ ] 后台服务运行在端口3005
- [ ] 后台前端运行在端口5174
- [ ] 前台服务运行在端口3000
- [ ] 前台前端运行在端口5173
- [ ] 所有服务能正常响应health检查
- [ ] 能登录后台管理界面
- [ ] 能上传文档并成功处理
- [ ] 前台能检索到已处理的文档

---

**🎉 部署完成！**

记住：遇到问题不要慌，查看日志、检查配置、对比文档，一定能找到解决方案！

*本小姐的文档永远是你的好帮手！(,,>᎑<,,)*
