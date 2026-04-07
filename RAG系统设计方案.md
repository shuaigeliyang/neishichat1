# RAG文档问答系统 - 设计方案

> **设计时间**：2026-03-25
> **设计师**：内师智能体系统 (￣▽￣)ﾉ
> **项目**：内江师范学院教育系统智能体 - 文档问答模块

---

## 📋 系统概述

### 目标
让本地智能体能够基于《内江师范学院学生手册》（318页）回答学生和辅导员的问题，确保回答准确且基于官方文档。

### 核心功能
- 🎯 **智能问答**：基于学生手册回答问题
- 📚 **文档检索**：快速定位相关文档片段
- ✅ **引用来源**：每个回答都标注文档出处
- 🔍 **精准匹配**：使用语义搜索找到最相关内容

---

## 🏗️ 技术架构

### 整体流程

```
用户问题
    ↓
【1. 问题向量化】
    ↓
【2. 语义检索】→ 从文档库中找到Top-K相关片段
    ↓
【3. 上下文构建】→ 将检索到的片段组织成上下文
    ↓
【4. 答案生成】→ 基于上下文使用智谱AI生成回答
    ↓
带引用的答案
```

### 数据处理流程

```
学生手册PDF (318页)
    ↓
【1. 文本提取】→ 提取所有文本内容
    ↓
【2. 文档分块】→ 按章节/段落切分成小块（500-1000字）
    ↓
【3. 元数据标注】→ 添加页码、章节、类型等信息
    ↓
【4. 向量化】→ 使用Embedding API转换为向量
    ↓
【5. 存储入库】→ 存储到MySQL数据库
```

---

## 📊 数据库设计

### 表结构：`document_chunks`

```sql
CREATE TABLE document_chunks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chunk_text TEXT NOT NULL,              -- 文档片段内容
    chunk_type VARCHAR(50),                 -- 片段类型（章节/条款/说明）
    page_num INT,                           -- 页码
    chapter_title VARCHAR(255),             -- 所属章节
    section_order INT,                      -- 片段顺序
    vector_embedding JSON,                  -- 向量嵌入（如果MySQL支持）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chunk_type (chunk_type),
    INDEX idx_chapter (chapter_title),
    FULLTEXT INDEX idx_content (chunk_text)
);
```

### 表结构：`qa_logs`（问答日志）

```sql
CREATE TABLE qa_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    chunks_used JSON,                       -- 使用的文档片段
    confidence FLOAT,                       -- 置信度
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_time (created_at)
);
```

---

## 🔧 核心模块设计

### 1. 文档处理模块 (documentProcessor.js)

**功能：**
- PDF文本提取（已完成✅）
- 智能分块（按章节、段落）
- 元数据提取
- 向量化处理

**分块策略：**
```javascript
// 优先级：章节 > 段落 > 固定长度
1. 按章节分块（识别"第X章"、"一、"等标题）
2. 章节内按段落分块（500-1000字）
3. 添加上下文窗口（前后各100字）
4. 标注元数据（页码、章节、类型）
```

### 2. 向量化模块 (embeddingService.js)

**功能：**
- 调用Embedding API
- 批量处理
- 缓存管理

**API选择：**
- 使用智谱AI的Embedding API（保持一致性）
- 或使用OpenAI Embeddings
- 模型：text-embedding-ada-002 或类似

### 3. 检索引擎 (retrievalEngine.js)

**功能：**
- 语义相似度搜索
- 关键词搜索（备用）
- Top-K选择
- 相关性评分

**检索算法：**
```javascript
// 1. 问题向量化
const questionEmbedding = await embedQuestion(question);

// 2. 计算相似度（余弦相似度）
const similarities = chunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(questionEmbedding, chunk.embedding)
}));

// 3. 排序并取Top-K
const topK = similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, K);

// 4. 过滤低分结果
const relevant = topK.filter(item => item.score > THRESHOLD);
```

### 4. 问答生成器 (qaGenerator.js)

**功能：**
- 构建提示词
- 调用智谱AI
- 格式化回答
- 添加引用

**提示词模板：**
```
你是一个内江师范学院的学生助手，基于《学生手册》回答学生问题。

【相关文档片段】：
{chunks}

【学生问题】：
{question}

【要求】：
1. 严格基于文档片段回答，不要编造信息
2. 如果文档中没有相关信息，明确告知学生
3. 回答要准确、清晰、易懂
4. 在回答中标注引用的页码和章节

【回答】：
```

### 5. 智能路由 (intelligentRouter.js)

**功能：**
- 判断问题是数据库查询还是文档问答
- 混合查询处理
- 意图识别

**路由逻辑：**
```javascript
// 数据库查询关键词
const dbKeywords = ['我的', '成绩', 'GPA', '排名', '选课'];

// 文档问答关键词
const docKeywords = ['怎么', '如何', '规定', '办法', '流程', '条件'];

// 路由判断
if (containsPersonalInfo(question)) {
    return 'database';
} else if (containsPolicyKeyword(question)) {
    return 'document';
} else {
    return 'mixed';  // 混合查询
}
```

---

## 📝 实现步骤

### 阶段一：数据处理（当前阶段）

- [x] 提取PDF文本内容
- [ ] 文档分块和结构化
- [ ] 向量化处理
- [ ] 存储到数据库

### 阶段二：检索引擎

- [ ] 实现相似度计算
- [ ] 实现Top-K检索
- [ ] 添加缓存机制

### 阶段三：问答生成

- [ ] 设计提示词模板
- [ ] 实现问答生成器
- [ ] 添加引用格式化

### 阶段四：系统集成

- [ ] 智能路由
- [ ] 与现有系统集成
- [ ] 前端界面优化

### 阶段五：测试优化

- [ ] 准确性测试
- [ ] 性能优化
- [ ] 用户体验优化

---

## 🎯 下一步行动

### 立即开始：
1. ✅ 创建文档分块脚本
2. ✅ 设计数据库表结构
3. ✅ 实现向量化模块
4. ✅ 构建检索引擎原型

### 技术准备：
- Node.js后端开发
- MySQL数据库操作
- 智谱AI API调用
- 向量相似度计算

---

**备注：**
此设计方案将随着项目进展持续更新。优先实现核心功能，后续优化性能和用户体验。
