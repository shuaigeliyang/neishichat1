/**
 * 文档注册表服务
 * 管理文档元数据、状态追踪、CRUD操作
 * @author 哈雷酱 (￣▽￣)／
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface SourceFile {
  fileName: string
  originalName?: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

interface Document {
  documentId: string
  name: string
  displayName: string
  description: string
  status: string
  priority: number
  tags: string[]
  sourceFiles: SourceFile[]
  directory: string
  statistics: {
    totalPages: number
    totalChunks: number
    indexedChunks: number
    fileSize: number
  }
  processingHistory: any[]
  indexedAt: string | null
  updatedAt: string
  autoDetected?: boolean
}

interface Registry {
  version: string
  createdAt: string
  updatedAt: string
  config: {
    indexName: string
    embeddingModel: string
    chunkStrategy: string
    chunkSize: number
    chunkOverlap: number
  }
  documents: Document[]
}

export class DocumentRegistry {
  private basePath: string
  private registryPath: string

  constructor() {
    // 文档根目录 - 从 src/services 往回4层到达项目根目录
    this.basePath = path.resolve(__dirname, '../../../../相关文档')
    this.registryPath = path.join(this.basePath, 'registry.json')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true })
    try {
      await fs.access(this.registryPath)
    } catch {
      await this.saveRegistry({
        version: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          indexName: 'retrieval_index',
          embeddingModel: 'embedding-3',
          chunkStrategy: 'intelligent',
          chunkSize: 1000,
          chunkOverlap: 200
        },
        documents: []
      })
      console.log('✓ 文档注册表已初始化')
    }
  }

  async getRegistry(): Promise<Registry> {
    try {
      const data = await fs.readFile(this.registryPath, 'utf-8')
      return JSON.parse(data)
    } catch {
      return {
        version: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          indexName: 'retrieval_index',
          embeddingModel: 'embedding-3',
          chunkStrategy: 'intelligent',
          chunkSize: 1000,
          chunkOverlap: 200
        },
        documents: []
      }
    }
  }

  async saveRegistry(registry: Registry): Promise<Registry> {
    registry.updatedAt = new Date().toISOString()
    await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2), 'utf-8')
    return registry
  }

  generateDocumentId(): string {
    const timestamp = Date.now()
    const shortId = uuidv4().substring(0, 8)
    return `doc_${timestamp}_${shortId}`
  }

  sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100)
  }

  async createDocumentStructure(document: Document): Promise<void> {
    const docDir = path.join(this.basePath, document.directory)
    const dirs = ['source', 'extracted/pages', 'extracted/images', 'chunks']
    for (const dir of dirs) {
      await fs.mkdir(path.join(docDir, dir), { recursive: true })
    }
    await fs.writeFile(
      path.join(docDir, 'meta.json'),
      JSON.stringify(document, null, 2),
      'utf-8'
    )
  }

  async registerDocument(documentInfo: {
    name?: string
    displayName?: string
    description?: string
    tags?: string[]
    priority?: number
    sourceFiles?: SourceFile[]
  }): Promise<Document> {
    const registry = await this.getRegistry()
    const documentId = this.generateDocumentId()
    const safeName = this.sanitizeFileName(documentInfo.name || documentInfo.displayName || '未命名文档')
    const directory = `doc_${documentId}`

    const document: Document = {
      documentId,
      name: safeName,
      displayName: documentInfo.displayName || safeName,
      description: documentInfo.description || '',
      status: 'pending',
      priority: documentInfo.priority || registry.documents.length + 1,
      tags: documentInfo.tags || [],
      sourceFiles: documentInfo.sourceFiles || [],
      directory,
      statistics: {
        totalPages: 0,
        totalChunks: 0,
        indexedChunks: 0,
        fileSize: documentInfo.sourceFiles?.[0]?.fileSize || 0
      },
      processingHistory: [],
      indexedAt: null,
      updatedAt: new Date().toISOString()
    }

    registry.documents.push(document)
    await this.saveRegistry(registry)
    await this.createDocumentStructure(document)

    console.log(`✓ 文档已注册: ${document.displayName} (${documentId})`)
    return document
  }

  async getDocument(documentId: string): Promise<Document | undefined> {
    const registry = await this.getRegistry()
    return registry.documents.find(d => d.documentId === documentId)
  }

  async checkProcessedStatus(docName: string, docDirectory: string | null = null): Promise<{
    status: string
    statistics: { totalPages: number; totalChunks: number; indexedChunks: number; fileSize: number }
    indexedAt: string | null
  }> {
    let extractPath: string | null = null

    if (docDirectory) {
      extractPath = path.join(this.basePath, docDirectory)
    } else {
      try {
        const entries = await fs.readdir(this.basePath)
        for (const entry of entries) {
          if (entry.startsWith('doc_') || entry === docName) {
            const metaPath = path.join(this.basePath, entry, 'meta.json')
            try {
              const metaData = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
              if (metaData.name === docName || metaData.displayName === docName) {
                extractPath = path.join(this.basePath, entry)
                break
              }
            } catch {}
          }
        }
      } catch {}
    }

    if (!extractPath) {
      return {
        status: 'pending',
        statistics: { totalPages: 0, totalChunks: 0, indexedChunks: 0, fileSize: 0 },
        indexedAt: null
      }
    }

    try {
      const contentPath = path.join(extractPath, 'extracted', 'content.json')
      const chunksPath = path.join(extractPath, 'chunks', 'chunks.json')
      const hasContent = await fs.access(contentPath).then(() => true).catch(() => false)
      const hasChunks = await fs.access(chunksPath).then(() => true).catch(() => false)

      if (hasContent && hasChunks) {
        let stats = { totalPages: 0, totalChunks: 0, indexedChunks: 0, fileSize: 0 }
        let indexedAt: string | null = null

        try {
          const contentData = JSON.parse(await fs.readFile(contentPath, 'utf-8'))
          stats.totalPages = contentData.total_pages || contentData.pages?.length || 0
        } catch {}

        try {
          const chunksData = JSON.parse(await fs.readFile(chunksPath, 'utf-8'))
          const chunks = chunksData.chunks || []
          stats.totalChunks = chunks.length
          stats.indexedChunks = chunks.length
        } catch {}

        try {
          const metaData = await fs.readFile(path.join(extractPath, 'meta.json'), 'utf-8')
          const meta = JSON.parse(metaData)
          indexedAt = meta.indexedAt
        } catch {
          indexedAt = new Date().toISOString()
        }

        return { status: 'indexed', statistics: stats, indexedAt }
      }
    } catch {}

    return {
      status: 'pending',
      statistics: { totalPages: 0, totalChunks: 0, indexedChunks: 0, fileSize: 0 },
      indexedAt: null
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    const registry = await this.getRegistry()

    try {
      await fs.mkdir(this.basePath, { recursive: true })
      const files = await fs.readdir(this.basePath)
      const docExtensions = ['.docx', '.doc', '.pdf', '.txt', '.md']
      const docFiles: any[] = []

      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (docExtensions.includes(ext)) {
          const filePath = path.join(this.basePath, file)
          try {
            const stats = await fs.stat(filePath)
            if (stats.isFile()) {
              docFiles.push({
                name: path.basename(file, ext),
                fileName: file,
                fileType: ext,
                fileSize: stats.size,
                updatedAt: stats.mtime.toISOString()
              })
            }
          } catch {}
        }
      }

      const documents: Document[] = []
      const registeredFiles = new Set(
        registry.documents
          .map(d => d.sourceFiles?.[0]?.fileName)
          .filter(Boolean) as string[]
      )

      // 添加已注册的文档
      for (const doc of registry.documents) {
        const actualStatus = await this.checkProcessedStatus(doc.name, doc.directory)
        if (actualStatus.status === 'indexed' && doc.status !== 'indexed') {
          doc.status = 'indexed'
          doc.statistics = { ...doc.statistics, ...actualStatus.statistics }
          doc.indexedAt = actualStatus.indexedAt
        }
        documents.push(doc)
      }

      // 自动添加未注册的文档
      for (const file of docFiles) {
        if (!registeredFiles.has(file.fileName)) {
          const processedStatus = await this.checkProcessedStatus(file.name)
          const documentId = this.generateDocumentId()
          const newDoc: Document = {
            documentId,
            name: file.name,
            displayName: file.name,
            description: '自动扫描发现的文档',
            status: processedStatus.status,
            priority: documents.length + 1,
            tags: [],
            sourceFiles: [{
              fileName: file.fileName,
              fileType: file.fileType,
              fileSize: file.fileSize,
              uploadedAt: file.updatedAt
            }],
            directory: `doc_${documentId}`,
            statistics: {
              ...processedStatus.statistics,
              fileSize: file.fileSize
            },
            processingHistory: [],
            indexedAt: processedStatus.indexedAt,
            updatedAt: file.updatedAt,
            autoDetected: true
          }
          documents.push(newDoc)
          console.log(`✓ 自动发现文档: ${file.name} - 状态: ${processedStatus.status}`)
        }
      }

      // 如果注册表为空且目录中有文件，同步更新
      if (registry.documents.length === 0 && documents.length > 0) {
        registry.documents = documents
        await this.saveRegistry(registry)
        console.log(`✓ 已同步 ${documents.length} 个文档到注册表`)
      }

      return documents
    } catch (error) {
      console.error('扫描文档目录失败:', error)
      return registry.documents
    }
  }

  async getStatistics(): Promise<{
    total: number
    indexed: number
    pending: number
    processing: number
    error: number
    totalChunks: number
    totalSize: number
  }> {
    const documents = await this.getAllDocuments()
    const totalSize = documents.reduce((sum, d) => {
      const statSize = d.statistics?.fileSize || 0
      if (statSize > 0) return sum + statSize
      return sum + (d.sourceFiles?.reduce((s, f) => s + (f.fileSize || 0), 0) || 0)
    }, 0)

    return {
      total: documents.length,
      indexed: documents.filter(d => d.status === 'indexed').length,
      pending: documents.filter(d => d.status === 'pending').length,
      processing: documents.filter(d =>
        ['extracting', 'extracted', 'chunking', 'chunked', 'indexing'].includes(d.status)
      ).length,
      error: documents.filter(d => d.status === 'error').length,
      totalChunks: documents.reduce((sum, d) => sum + (d.statistics?.totalChunks || 0), 0),
      totalSize
    }
  }

  async updateDocumentStatus(
    documentId: string,
    status: string,
    details: any = {}
  ): Promise<Document> {
    const registry = await this.getRegistry()
    const document = registry.documents.find(d => d.documentId === documentId)

    if (!document) {
      throw new Error(`文档不存在: ${documentId}`)
    }

    document.status = status
    document.updatedAt = new Date().toISOString()

    if (details.statistics) {
      document.statistics = { ...document.statistics, ...details.statistics }
    }

    if (details.step) {
      document.processingHistory.push({
        step: details.step,
        status: details.status || status,
        timestamp: new Date().toISOString(),
        details: details.details || ''
      })
    }

    if (status === 'indexed' && !document.indexedAt) {
      document.indexedAt = new Date().toISOString()
    }

    await this.saveRegistry(registry)
    return document
  }

  async deleteDocument(documentId: string): Promise<Document> {
    const registry = await this.getRegistry()
    const index = registry.documents.findIndex(d => d.documentId === documentId)

    if (index === -1) {
      throw new Error(`文档不存在: ${documentId}`)
    }

    const document = registry.documents.splice(index, 1)[0]
    await this.saveRegistry(registry)
    console.log(`✓ 文档已从注册表删除: ${documentId}`)
    return document
  }
}

export default new DocumentRegistry()
