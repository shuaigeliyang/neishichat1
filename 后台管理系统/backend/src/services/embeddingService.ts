/**
 * 向量化服务（本地优先版）
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：将文本转换为向量，支持本地服务和API两种模式
 *
 * 优先使用本地embedding服务（5001端口）
 * 如果本地服务不可用，回退到API调用
 */

import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface EmbeddingCache {
  [key: string]: number[]
}

export class EmbeddingService {
  private apiKey: string
  private apiUrl: string
  private model: string
  private localUrl: string
  private cache: Map<string, number[]>
  private cacheFilePath: string
  private requestQueue: Array<{
    fn: () => Promise<number[]>
    resolve: (value: number[]) => void
    reject: (error: any) => void
    retries: number
  }>
  private isProcessing: boolean
  private useLocal: boolean
  private maxRetries: number

  constructor(apiKey?: string, cacheFilePath?: string) {
    this.apiKey = apiKey || process.env.ZHIPU_API_KEY || ''
    this.apiUrl = 'https://open.bigmodel.cn/api/paas/v4/embeddings'
    this.model = 'embedding-3'
    this.localUrl = 'http://localhost:5001'
    this.cacheFilePath = cacheFilePath || path.join(__dirname, '../../../embedding_cache.json')
    this.cache = new Map()
    this.requestQueue = []
    this.isProcessing = false
    this.useLocal = true  // 优先使用本地服务
    this.maxRetries = 3

    // 加载缓存
    this.loadCacheFromFile()

    // 检测本地服务是否可用
    this.checkLocalService()
  }

  /**
   * 检测本地服务是否可用
   */
  private async checkLocalService(): Promise<void> {
    try {
      const response = await axios.get(`${this.localUrl}/health`, { timeout: 2000 })
      if (response.data?.status === 'ok') {
        this.useLocal = true
        console.log(`✓ 本地Embedding服务已就绪: ${response.data.model}`)
      } else {
        this.useLocal = false
        console.log('⚠️ 本地Embedding服务状态异常，尝试使用API...')
      }
    } catch {
      this.useLocal = false
      console.log('⚠️ 本地Embedding服务不可用，将尝试使用API...')
    }
  }

  /**
   * 加载缓存
   */
  private async loadCacheFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFilePath, 'utf-8')
      const cacheObj: EmbeddingCache = JSON.parse(data)
      for (const [key, value] of Object.entries(cacheObj)) {
        this.cache.set(key, value)
      }
      console.log(`✓ 向量缓存已加载，共 ${this.cache.size} 条`)
    } catch {
      console.log('⚠️ 向量缓存文件不存在，将创建新的')
    }
  }

  /**
   * 保存缓存到文件
   */
  private async saveCacheToFile(): Promise<void> {
    try {
      const cacheObj: EmbeddingCache = {}
      for (const [key, value] of this.cache.entries()) {
        cacheObj[key] = value
      }
      await fs.writeFile(this.cacheFilePath, JSON.stringify(cacheObj, null, 2), 'utf-8')
    } catch (error) {
      console.error('✗ 保存向量缓存失败:', error)
    }
  }

  /**
   * 简单的哈希函数
   */
  private hashText(text: string): string {
    const truncated = text.substring(0, 200)
    let hash = 0
    for (let i = 0; i < truncated.length; i++) {
      const char = truncated.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36) + '_' + truncated.length
  }

  /**
   * 队列处理
   */
  private enqueueRequest(requestFn: () => Promise<number[]>): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        fn: requestFn,
        resolve,
        reject,
        retries: 0
      })

      if (!this.isProcessing) {
        this.processQueue()
      }
    })
  }

  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const task = this.requestQueue.shift()!

    try {
      const result = await task.fn()
      task.resolve(result)
    } catch (error: any) {
      if (error.response?.status === 429 && task.retries < this.maxRetries) {
        task.retries++
        console.log(`⚠️ 遇到限流，重试第${task.retries}次...`)
        const backoffTime = Math.pow(2, task.retries) * 1000
        await this.sleep(backoffTime)
        this.requestQueue.unshift(task)
      } else {
        task.reject(error)
      }
    }

    setTimeout(() => this.processQueue(), 200)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 为单个文本生成向量
   */
  async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.hashText(text)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    return this.enqueueRequest(async () => {
      let embedding: number[]

      // 优先使用本地服务（重试机制）
      let localFailed = false
      try {
        const response = await axios.post(
          `${this.localUrl}/embed`,
          { text },
          { timeout: 30000 }
        )
        embedding = response.data.embedding
      } catch (error: any) {
        console.error('✗ 本地embedding失败:', error.message)
        localFailed = true
        this.useLocal = false
      }

      // 如果本地服务失败，尝试API
      if (localFailed || !this.useLocal) {
        // 检查API Key
        if (!this.apiKey) {
          throw new Error('本地Embedding服务不可用，且未配置API Key。请确保本地Embedding服务正在运行（port 5001）')
        }
        try {
          embedding = await this.getEmbeddingFromAPI(text)
        } catch (error: any) {
          console.error('✗ API embedding失败:', error.message)
          // 再次尝试本地服务（可能是临时的）
          try {
            const response = await axios.post(
              `${this.localUrl}/embed`,
              { text },
              { timeout: 30000 }
            )
            embedding = response.data.embedding
            this.useLocal = true
            console.log('✓ 本地Embedding服务恢复')
          } catch {
            throw new Error('无法生成embedding：本地服务和API都不可用')
          }
        }
      }

      this.cache.set(cacheKey, embedding)
      await this.saveCacheToFile()
      return embedding
    })
  }

  /**
   * 从API获取向量
   */
  private async getEmbeddingFromAPI(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('未配置API Key')
    }
    const response = await axios.post(
      this.apiUrl,
      { model: this.model, input: text },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )
    return response.data.data[0].embedding
  }

  /**
   * 批量生成向量
   */
  async getBatchEmbeddings(texts: string[], batchSize: number = 10): Promise<number[][]> {
    const embeddings: number[][] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      console.log(`  - 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`)

      const batchPromises = batch.map(text => this.getEmbedding(text))
      const batchResults = await Promise.all(batchPromises)
      embeddings.push(...batchResults)

      await this.sleep(500)
    }

    return embeddings
  }

  /**
   * 为文档块生成向量
   * ✅ 保留所有原始字段（包括 page_num, chapter_title 等）
   */
  async embedChunks(chunks: Array<any>): Promise<Array<any>> {
    const texts = chunks.map(c => c.text)
    const embeddings = await this.getBatchEmbeddings(texts)

    return chunks.map((chunk, index) => ({
      ...chunk,  // ✅ 保留所有原始字段
      embedding: embeddings[index]
    }))
  }

  /**
   * 保存缓存
   */
  async saveCache(cachePath?: string): Promise<void> {
    const savePath = cachePath || this.cacheFilePath
    try {
      const cacheObj: EmbeddingCache = {}
      for (const [key, value] of this.cache.entries()) {
        cacheObj[key] = value
      }
      await fs.writeFile(savePath, JSON.stringify(cacheObj, null, 2), 'utf-8')
      console.log(`✓ 向量缓存已保存: ${savePath}`)
    } catch (error) {
      console.error('✗ 保存向量缓存失败:', error)
    }
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size
  }
}

export default new EmbeddingService()
