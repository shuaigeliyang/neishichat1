# 本地Embedding服务部署指南
设计师：哈雷酱 (￣▽￣)ﾉ

## 📋 概述

本方案使用Python的sentence-transformers库提供本地embedding服务，彻底解决API限流问题！

### ✨ 优势

- ✅ **完全本地化**：无需API key
- ✅ **无限流**：想用多少用多少
- ✅ **中文支持好**：paraphrase-multilingual-MiniLM-L12-v2
- ✅ **性能优秀**：批量处理效率高
- ✅ **完全免费**：开源模型，无需付费

---

## 🚀 快速开始

### 步骤1：安装Python依赖

**Windows:**
```bash
# 双击运行
start-local-embedding.bat
```

**Linux/Mac:**
```bash
chmod +x start-local-embedding.sh
./start-local-embedding.sh
```

**手动安装:**
```bash
# 创建虚拟环境
python -m venv .venv_embedding

# 激活虚拟环境
# Windows:
.venv_embedding\Scripts\activate
# Linux/Mac:
source .venv_embedding/bin/activate

# 安装依赖
pip install -r requirements-embedding.txt
```

### 步骤2：启动Python服务

```bash
python local_embedding_service.py
```

**首次启动需要下载模型（约500MB），请耐心等待！**

### 步骤3：测试服务

**方法1：使用测试脚本**
```bash
node pythonEmbeddingClient.js
```

**方法2：使用curl**
```bash
# 健康检查
curl http://localhost:5001/health

# 生成embedding
curl -X POST http://localhost:5001/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "重修管理办法"}'
```

---

## 🔧 配置说明

### 修改.env文件

```bash
# 使用本地embedding模式
EMBEDDING_MODE=python

# Python服务地址
PYTHON_EMBEDDING_URL=http://localhost:5001
```

### 服务端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/embed` | POST | 生成单个文本向量 |
| `/embed_batch` | POST | 批量生成向量 |
| `/similarity` | POST | 计算余弦相似度 |
| `/cache/stats` | GET | 缓存统计 |
| `/cache/clear` | POST | 清空缓存 |

---

## 📊 性能对比

| 指标 | API模式 | 本地模式 |
|------|---------|----------|
| 请求限制 | ❌ 有限流 | ✅ 无限流 |
| 响应时间 | ~2秒 | ~0.5秒 |
| 成本 | 💰 按次付费 | ✅ 完全免费 |
| 隐私 | ❌ 数据上传 | ✅ 完全本地 |
| 稳定性 | ⚠️ 依赖网络 | ✅ 完全稳定 |

---

## 💡 使用示例

### Node.js中使用

```javascript
const PythonEmbeddingClient = require('./pythonEmbeddingClient');

async function example() {
    const client = new PythonEmbeddingClient();
    
    // 检查服务
    await client.checkService();
    
    // 生成embedding
    const embedding = await client.getEmbedding('重修管理办法');
    console.log('向量维度:', embedding.length);
    
    // 批量生成
    const embeddings = await client.getBatchEmbeddings([
        '奖学金申请',
        '挂科处理',
        '考试作弊'
    ]);
    
    console.log('生成了', embeddings.length, '个向量');
}
```

### RAG服务集成

```javascript
// 在multiDocumentRagService.js中使用
const PythonEmbeddingClient = require('./pythonEmbeddingClient');

class MultiDocumentRAGService {
    constructor(apiKey, options = {}) {
        // ...
        this.embeddingClient = new PythonEmbeddingClient();
    }
    
    async generateEmbedding(text) {
        return this.embeddingClient.getEmbedding(text);
    }
}
```

---

## 🛠️ 故障排除

### 问题1：Python服务启动失败

**错误：** `ModuleNotFoundError: No module named 'flask'`

**解决：**
```bash
# 确保虚拟环境已激活
# Windows:
.venv_embedding\Scripts\activate
# Linux/Mac:
source .venv_embedding/bin/activate

# 重新安装依赖
pip install -r requirements-embedding.txt
```

### 问题2：模型下载失败

**错误：** 下载模型时网络超时

**解决：**
```bash
# 使用国内镜像
export HF_ENDPOINT=https://hf-mirror.com
python local_embedding_service.py
```

### 问题3：Node.js连接失败

**错误：** `ECONNREFUSED` 或 `connect ECONNREFUSED`

**解决：**
1. 确保Python服务已启动
2. 检查端口5001是否被占用
3. 查看Python服务日志

---

## 📝 注意事项

1. **首次启动慢**：需要下载模型（约500MB），请耐心等待
2. **内存占用**：模型加载后约占用1-2GB内存
3. **端口冲突**：默认使用5001端口，如有冲突请修改
4. **模型缓存**：支持缓存，相同问题秒级响应

---

## 🎉 完成！

启动成功后，你的RAG服务将完全使用本地embedding，不再受API限流限制！

才、才不是本小姐特别用心帮你做的呢！(,,><,,)
