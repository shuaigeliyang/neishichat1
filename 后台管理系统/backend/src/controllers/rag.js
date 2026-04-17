import fs from 'fs/promises'
import path from 'path'
import EmbeddingService from '../services/embeddingService.js'
import RetrievalEngine from '../services/retrievalEngine.js'
import QAGenerator from '../services/qaGenerator.js'

// 知识库索引路径
const INDEX_PATH = path.join(process.cwd(), 'output', 'retrieval_index.json')

// 加载索引
let retrievalIndex = null
let embeddingService = null
let retrievalEngine = null
let qaGenerator = null

/**
 * 初始化RAG系统
 */
async function initializeRAG() {
  try {
    // 检查索引文件是否存在
    try {
      await fs.access(INDEX_PATH)
    } catch {
      console.log('知识库索引不存在，需要先生成索引')
      return false
    }

    // 加载索引
    const indexData = await fs.readFile(INDEX_PATH, 'utf-8')
    retrievalIndex = JSON.parse(indexData)

    // 初始化服务（使用本地Python embedding，不需要API密钥）
    const apiKey = process.env.ANTHROPIC_API_KEY || null

    embeddingService = new EmbeddingService(null) // apiKey参数保留但不使用
    retrievalEngine = new RetrievalEngine(retrievalIndex, apiKey)
    qaGenerator = new QAGenerator(apiKey)

    console.log('✓ RAG系统初始化成功')
    console.log(`✓ 加载了 ${retrievalIndex.chunks.length} 个文档块`)

    return true
  } catch (error) {
    console.error('RAG系统初始化失败:', error)
    return false
  }
}

/**
 * 问答接口
 */
export async function queryRAG(req, res) {
  try {
    const { question } = req.body

    if (!question) {
      res.status(400).json({
        success: false,
        error: '请提供问题'
      })
      return
    }

    // 确保RAG系统已初始化
    if (!retrievalEngine || !qaGenerator) {
      const initialized = await initializeRAG()
      if (!initialized) {
        res.status(500).json({
          success: false,
          error: 'RAG系统未初始化，请先生成知识库索引'
        })
        return
      }
    }

    console.log(`收到问题: ${question}`)

    // 1. 生成问题向量
    const queryEmbedding = await embeddingService.generateEmbedding(question)

    // 2. 检索相关文档
    const sources = await retrievalEngine.retrieve(question, queryEmbedding, {
      topK: 15,
      useRerank: true,
      deduplicate: true
    })

    // 3. 生成答案
    const result = await qaGenerator.generateAnswer(question, sources)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('RAG查询失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'RAG查询失败'
    })
  }
}

/**
 * 获取索引状态
 */
export async function getIndexStatus(req, res) {
  try {
    // 检查索引文件是否存在
    try {
      await fs.access(INDEX_PATH)
    } catch {
      res.json({
        success: true,
        data: {
          indexed: false,
          message: '知识库索引不存在'
        }
      })
      return
    }

    // 读取索引信息
    const indexData = await fs.readFile(INDEX_PATH, 'utf-8')
    const index = JSON.parse(indexData)

    res.json({
      success: true,
      data: {
        indexed: true,
        total_chunks: index.chunks.length,
        vector_dimension: index.metadata.vector_dimension,
        last_updated: index.metadata.timestamp,
        source_file: index.metadata.source_file
      }
    })
  } catch (error) {
    console.error('获取索引状态失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '获取索引状态失败'
    })
  }
}

/**
 * 搜索文档片段
 */
export async function searchDocuments(req, res) {
  try {
    const { q } = req.query
    const query = q

    if (!query) {
      res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      })
      return
    }

    // 确保RAG系统已初始化
    if (!retrievalEngine) {
      const initialized = await initializeRAG()
      if (!initialized) {
        res.status(500).json({
          success: false,
          error: 'RAG系统未初始化'
        })
        return
      }
    }

    // 生成查询向量
    const queryEmbedding = await embeddingService.generateEmbedding(query)

    // 检索相关文档
    const results = await retrievalEngine.retrieve(query, queryEmbedding, {
      topK: 10,
      useRerank: true,
      deduplicate: true
    })

    // 返回结果
    const documents = results.map(r => ({
      chunk_id: r.chunk.chunk_id,
      content: r.chunk.text,
      page: r.chunk.page_num,
      score: r.score,
      char_count: r.chunk.char_count
    }))

    res.json({
      success: true,
      data: documents
    })
  } catch (error) {
    console.error('文档搜索失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '文档搜索失败'
    })
  }
}
