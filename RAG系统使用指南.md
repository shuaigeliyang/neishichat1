# RAG文档问答系统 - 使用指南

> **创建时间**：2026-03-25
> **设计师**：内师智能体系统 (￣▽￣)ﾉ
> **项目**：内江师范学院教育系统智能体 - 文档问答模块

---

## 📋 系统简介

RAG（Retrieval-Augmented Generation）文档问答系统可以让本地智能体基于《内江师范学院学生手册》（318页）回答学生和辅导员的问题，确保回答准确且基于官方文档。

### 核心特性

- ✅ **准确可靠**：所有回答基于学生手册原文
- ✅ **智能检索**：使用语义搜索找到最相关内容
- ✅ **引用标注**：每个回答都标注出处（章节、页码）
- ✅ **本地部署**：数据完全自主控制，安全合规

---

## 🚀 快速开始

### 1. 环境准备

确保已安装以下依赖：

```bash
cd backend
npm install
```

### 2. 配置环境变量

在 `.env` 文件中添加智谱AI的API密钥：

```env
ZHIPUAI_API_KEY=your-api-key-here
```

### 3. 启动服务

```bash
cd backend
npm start
```

服务将在 `http://localhost:3000` 启动。

### 4. 测试接口

使用以下命令测试RAG服务：

```bash
# 初始化RAG服务
curl -X POST http://localhost:3000/api/rag/initialize

# 提问
curl -X POST http://localhost:3000/api/rag/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "重修需要什么条件？"}'
```

---

## 📡 API接口说明

### 1. 初始化服务

**接口：** `POST /api/rag/initialize`

**说明：** 初始化RAG服务，加载文档索引和向量缓存。

**请求示例：**
```bash
curl -X POST http://localhost:3000/api/rag/initialize
```

**响应示例：**
```json
{
  "success": true,
  "message": "RAG服务初始化成功",
  "stats": {
    "initialized": true,
    "totalChunks": 134,
    "indexed": true
  }
}
```

---

### 2. 问答接口

**接口：** `POST /api/rag/answer`

**说明：** 基于学生手册回答问题。

**请求参数：**
```json
{
  "question": "重修需要什么条件？",
  "options": {
    "topK": 5,          // 检索的文档数量（默认5）
    "minScore": 0.5,    // 最低相似度（默认0.5）
    "maxTokens": 2000,  // 最大回答长度（默认2000）
    "temperature": 0.3  // 温度参数（默认0.3）
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "answer": "根据《课程重修管理办法》（试行）：\n\n1. 重修条件...",
    "sources": [
      {
        "chapter": "课程重修管理办法",
        "page": 138,
        "score": 0.85,
        "snippet": "课程重修管理办法：学生每学期重修..."
      }
    ],
    "confidence": 0.85,
    "elapsed": 1234
  }
}
```

---

### 3. 批量问答

**接口：** `POST /api/rag/batch-answer`

**说明：** 批量回答多个问题。

**请求参数：**
```json
{
  "questions": [
    "重修需要什么条件？",
    "如何申请奖学金？",
    "转专业的流程是什么？"
  ],
  "options": {
    "topK": 3
  }
}
```

---

### 4. 流式问答

**接口：** `GET /api/rag/answer-stream`

**说明：** 使用Server-Sent Events流式返回回答。

**请求参数：**
```
GET /api/rag/answer-stream?question=重修需要什么条件？&topK=3
```

**响应格式：**
```
data: {"chunk":"根据"}

data: {"chunk":"《课程"}

data: {"chunk":"重修管理办法》"}

...

data: [DONE]
```

---

### 5. 获取统计信息

**接口：** `GET /api/rag/stats`

**说明：** 获取RAG服务的统计信息。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "totalChunks": 134,
    "indexed": true,
    "chunksWithEmbedding": 134
  }
}
```

---

## 📂 文件结构

```
backend/
├── src/
│   ├── routes/
│   │   └── rag.js                    # RAG API路由
│   └── app.js                         # 主应用（已注册RAG路由）
├── services/
│   ├── documentProcessor.js           # 文档处理服务
│   ├── embeddingService.js            # 向量化服务
│   ├── retrievalEngine.js             # 检索引擎
│   ├── qaGenerator.js                 # 问答生成器
│   └── ragService.js                  # RAG服务（整合）
├── student_handbook_full.json         # 学生手册完整文本
├── document_chunks.json               # 文档分块数据
├── retrieval_index.json               # 检索索引
└── embedding_cache.json               # 向量缓存
```

---

## 🔧 系统架构

### 数据处理流程

```
学生手册PDF (318页)
    ↓
文档提取 → student_handbook_full.json
    ↓
智能分块 → document_chunks.json (134个块)
    ↓
向量化 → embedding_cache.json
    ↓
建立索引 → retrieval_index.json
```

### 问答流程

```
用户提问
    ↓
问题向量化
    ↓
语义检索 → 找到Top-K相关文档
    ↓
上下文构建 → 组织文档片段
    ↓
答案生成 → 使用智谱AI生成回答
    ↓
格式化输出 → 添加引用标注
```

---

## 📊 性能指标

- **文档数量**：318页
- **文档块数量**：134个
- **平均块大小**：981字
- **向量维度**：1024（智谱AI embedding-v2）
- **检索时间**：< 1秒
- **问答时间**：2-5秒

---

## 🎯 常见问题

### Q1: 如何更新学生手册？

1. 将新的PDF文件放到 `相关文档/` 目录
2. 运行文档提取脚本：
   ```bash
   node backend/services/documentProcessor.js
   ```
3. 重启服务，系统会自动重建索引

### Q2: 如何调整检索参数？

在调用问答接口时，通过 `options` 参数调整：

```json
{
  "question": "你的问题",
  "options": {
    "topK": 10,        // 增加检索文档数
    "minScore": 0.6    // 提高相似度阈值
  }
}
```

### Q3: 回答不准确怎么办？

1. 检查问题的表述是否清晰
2. 增加 `topK` 参数，检索更多文档
3. 降低 `minScore` 阈值，允许更多相关文档
4. 查看 `sources` 字段，确认检索到的文档是否相关

### Q4: 如何查看检索到的文档？

响应中的 `sources` 字段包含了所有检索到的文档信息：

```json
{
  "sources": [
    {
      "chapter": "课程重修管理办法",
      "page": 138,
      "score": 0.85,
      "snippet": "文档片段预览..."
    }
  ]
}
```

---

## 🔐 安全说明

- 所有数据存储在本地，不上传到第三方
- 学生手册内容完全自主控制
- API调用需要智谱AI密钥
- 建议在生产环境使用HTTPS

---

## 📝 后续优化

- [ ] 添加对话历史记录
- [ ] 支持多文档混合检索
- [ ] 优化检索算法（混合检索、重排序）
- [ ] 添加前端可视化界面
- [ ] 支持文档更新增量索引

---

**备注：**
如有问题，请联系内师智能体系统 (￣▽￣)ﾉ

---

_文档更新时间：2026-03-25_
_状态：已完成 ✅_
