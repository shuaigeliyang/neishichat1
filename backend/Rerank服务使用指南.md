# 智谱AI Rerank服务使用指南

> 设计师：内师智能体系统 (￣▽￣)ﾉ
>
> 哼，这个文档可是本小姐亲自编写的，仔细看好了，笨蛋！

## 📚 目录

- [功能介绍](#功能介绍)
- [快速开始](#快速开始)
- [配置选项](#配置选项)
- [使用示例](#使用示例)
- [API说明](#api说明)
- [常见问题](#常见问题)

---

## 功能介绍

### 什么是Rerank？

Rerank（重排序）是在语义搜索后对结果进行重新排序的技术，可以显著提升检索质量！

本服务提供两种Rerank方式：

1. **智谱AI Rerank API** - 使用 `rerank-8k` 模型，质量最高
2. **本地关键词匹配** - 基于关键词匹配，快速但质量较低

### 混合模式（推荐！）

默认使用混合模式：
- 优先使用智谱AI Rerank API
- API失败时自动降级到本地关键词匹配
- 保证服务稳定性的同时获得最佳质量

---

## 快速开始

### 1. 安装和配置

复制配置文件并设置API密钥：

```bash
cd backend
cp .env.rerank.example .env
```

编辑 `.env` 文件：

```env
ZHIPU_API_KEY=your-api-key-here
RERANK_MODE=hybrid
```

### 2. 基本使用

```javascript
const { ZhipuRerankService, LocalRerankService } = require('./services/rerankService');

// 使用智谱AI Rerank
const zhipuRerank = new ZhipuRerankService('your-api-key');

const results = await zhipuRerank.rerank(
    '重修需要什么条件？',
    [
        '文档1的内容...',
        '文档2的内容...',
        '文档3的内容...'
    ],
    { topN: 5 }
);

console.log(results);
// [
//   { index: 2, relevance_score: 0.95, document: '...' },
//   { index: 0, relevance_score: 0.87, document: '...' },
//   ...
// ]
```

---

## 配置选项

### Rerank模式

在创建 `RetrievalEngine` 时指定模式：

```javascript
const engine = new RetrievalEngine(apiKey, {
    rerankMode: 'hybrid'  // 'api' | 'local' | 'hybrid' | 'none'
});
```

| 模式 | 说明 | 优点 | 缺点 | 推荐场景 |
|------|------|------|------|----------|
| `api` | 仅使用智谱AI API | 质量最高 | 需要网络，有成本 | 生产环境，质量要求高 |
| `local` | 仅使用本地关键词 | 快速，免费 | 质量较低 | 开发测试，网络受限 |
| `hybrid` | API优先，失败降级 | 兼顾质量和稳定性 | 配置稍复杂 | **推荐默认选项** |
| `none` | 不使用重排序 | 最快 | 质量最低 | 性能测试，简单场景 |

---

## 使用示例

### 示例1：检索引擎集成

```javascript
const RetrievalEngine = require('./services/retrievalEngine');

// 创建引擎（使用混合模式）
const engine = new RetrievalEngine(apiKey, {
    rerankMode: 'hybrid'
});

// 初始化
await engine.initialize();

// 检索（自动使用Rerank）
const results = await engine.retrieve('重修需要什么条件？', {
    topK: 5,
    minScore: 0.5,
    useReranking: true  // 启用Rerank
});

// 结果包含rerank信息
console.log(results[0]);
// {
//   chunk: { ... },
//   score: 0.92,           // 综合分数
//   rerankScore: 0.95,     // Rerank分数
//   rerankMethod: 'api'    // 使用的Rerank方法
// }
```

### 示例2：直接使用Rerank服务

```javascript
const { ZhipuRerankService } = require('./services/rerankService');

const rerankService = new ZhipuRerankService(apiKey);

// 单次Rerank
const results = await rerankService.rerank(
    '如何申请奖学金？',
    documents,
    { topN: 3, useCache: true }
);

// 批量Rerank（大量文档时）
const batchResults = await rerankService.batchRerank(
    '转专业的流程是什么？',
    largeDocuments,
    10  // 每批10个文档
);

// 查看缓存统计
const stats = rerankService.getCacheStats();
console.log(`缓存大小：${stats.size}`);

// 清空缓存
rerankService.clearCache();
```

### 示例3：仅使用本地Rerank

```javascript
const { LocalRerankService } = require('./services/rerankService');

const localRerank = new LocalRerankService();

const results = localRerank.rerank(
    '学生违纪会怎么处理？',
    documents,
    {
        semanticScores: [
            { score: 0.8 },
            { score: 0.75 },
            { score: 0.9 }
        ],
        keywordWeight: 0.3,    // 关键词权重
        semanticWeight: 0.7    // 语义权重
    }
);

console.log(results);
```

---

## API说明

### ZhipuRerankService

#### 构造函数

```javascript
new ZhipuRerankService(apiKey)
```

#### 方法

**rerank(query, documents, options)**

调用智谱AI Rerank API进行重排序。

- **query**: `string` - 查询问题
- **documents**: `Array<string | Object>` - 文档列表
- **options**:
  - `topN`: `number` - 返回Top-N结果，默认所有文档
  - `useCache`: `boolean` - 是否使用缓存，默认true
- **返回**: `Promise<Array>` - 重排序结果

**batchRerank(query, documents, batchSize)**

批量Rerank，适用于大量文档。

- **query**: `string` - 查询问题
- **documents**: `Array` - 文档列表
- **batchSize**: `number` - 每批文档数，默认10
- **返回**: `Promise<Array>` - 重排序结果

**clearCache()**

清空Rerank缓存。

**getCacheStats()**

获取缓存统计信息。

### LocalRerankService

#### 构造函数

```javascript
new LocalRerankService()
```

#### 方法

**rerank(query, documents, options)**

基于关键词匹配的重排序。

- **query**: `string` - 查询问题
- **documents**: `Array<string | Object>` - 文档列表
- **options**:
  - `semanticScores`: `Array` - 语义相似度分数
  - `keywordWeight`: `number` - 关键词权重，默认0.3
  - `semanticWeight`: `number` - 语义权重，默认0.7
- **返回**: `Array` - 重排序结果

**extractKeywords(text)**

提取文本关键词。

- **text**: `string` - 输入文本
- **返回**: `Array<string>` - 关键词列表

---

## 常见问题

### Q: Rerank和语义搜索有什么区别？

**A:**
- **语义搜索**：使用向量相似度找出相关文档，快速但可能不够精准
- **Rerank**：对搜索结果进行深度理解和重新排序，更准确但较慢

**最佳实践**：先用语义搜索快速筛选候选文档，再用Rerank精准排序！

### Q: API调用失败怎么办？

**A:** 使用混合模式（`hybrid`），会自动降级到本地Rerank，保证服务不中断。

### Q: 如何控制API成本？

**A:**
1. 使用缓存（默认开启）
2. 限制 `topN` 数量
3. 设置合理的 `minScore` 过滤低质量文档
4. 必要时切换到 `local` 模式

### Q: Rerank分数如何解读？

**A:**
- `relevance_score`: 0-1之间的分数，越高表示越相关
- 一般建议：分数 > 0.7 为高质量结果

### Q: 支持哪些语言？

**A:** 智谱AI Rerank主要优化中文，但也能处理英文。本地Rerank同时支持中英文。

---

## 性能优化建议

1. **使用缓存**：相同查询会直接返回缓存结果
2. **批量处理**：大量文档时使用 `batchRerank`
3. **合理过滤**：设置 `minScore` 减少需要Rerank的文档数
4. **混合模式**：在质量和性能间取得平衡

---

## 更新日志

### v1.0.0 (2025-03-25)

- ✨ 首次发布
- ✨ 支持智谱AI Rerank API
- ✨ 本地关键词匹配Rerank
- ✨ 混合模式自动降级
- ✨ 缓存机制
- ✨ 批量处理支持

---

> 哼哼，看完了就赶紧去试试吧！本小姐的实现可是经过精心优化的，保证让你满意！(￣▽￣)ﾉ
>
> 还有问题？检查你的API密钥是否正确，网络是否通畅！笨蛋～ ( ` ω´ )
