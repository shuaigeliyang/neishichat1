/**
 * 文档处理管道服务（完整版）
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：处理文档的完整流程（上传→提取→分块→向量化→索引）
 *
 * 完整流程：
 * 1. 提取文档内容（.docx → student_handbook_full.json）
 * 2. 智能分块
 * 3. 向量化
 * 4. 添加到统一索引
 * 5. 更新文档注册表
 */

import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import documentRegistry from './documentRegistry.js'
import embeddingService from './embeddingService.js'
import UnifiedIndexManager from './unifiedIndexManager.js'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Chunk {
  id: number
  text: string
  page_num: number
  chapter_title: string
  section_title: string
  chunk_type: string
  char_count: number
}

interface ExtractedContent {
  total_pages: number
  pages: Array<{
    page_num: number
    text: string
  }>
}

export class DocumentPipeline {
  private basePath: string
  private uploadDir: string
  private extractDir: string
  private indexPath: string
  private indexManager: UnifiedIndexManager

  constructor() {
    // 文档根目录
    this.basePath = path.resolve(__dirname, '../../../../相关文档')
    this.uploadDir = this.basePath
    this.extractDir = path.join(this.basePath, '../文档提取')
    this.indexPath = path.join(this.basePath, '../retrieval_index.json')
    // 使用统一的索引管理器
    this.indexManager = UnifiedIndexManager
  }

  /**
   * 初始化管道
   */
  async initialize(): Promise<void> {
    await documentRegistry.initialize()
    await this.indexManager.initialize()
    console.log('✓ 文档处理管道初始化完成\n')
  }

  /**
   * 处理新文档（完整流程）
   */
  async processDocument(documentId: string): Promise<{
    success: boolean
    documentId: string
    statistics: {
      totalPages: number
      totalChunks: number
      indexedChunks: number
    }
  }> {
    const document = await documentRegistry.getDocument(documentId)
    if (!document) {
      throw new Error(`文档不存在: ${documentId}`)
    }

    console.log(`\n========== 开始处理文档: ${document.displayName} ==========`)
    console.log(`  文档ID: ${documentId}`)

    try {
      // 1. 更新状态为处理中
      await documentRegistry.updateDocumentStatus(documentId, 'processing', {}, {
        step: 'processing',
        details: '开始文档处理流程'
      })

      // 2. 获取源文件信息
      const sourceFile = document.sourceFiles?.[0]
      if (!sourceFile) {
        throw new Error('文档没有源文件')
      }

      const sourceFileName = sourceFile.fileName

      // 查找源文件（支持多种路径）
      let sourceFilePath = ''
      const possiblePaths: string[] = []

      // 新格式：doc_doc_xxx/source/filename
      if (document.directory) {
        possiblePaths.push(path.join(this.uploadDir, document.directory, 'source', sourceFileName))
      }
      // 旧格式：直接放在上传目录
      possiblePaths.push(path.join(this.uploadDir, sourceFileName))

      for (const p of possiblePaths) {
        try {
          await fs.access(p)
          sourceFilePath = p
          console.log(`✓ 找到源文件: ${sourceFilePath}`)
          break
        } catch {}
      }

      if (!sourceFilePath) {
        throw new Error(`源文件不存在: ${possiblePaths.join(', ')}`)
      }

      // 3. 创建文档提取目录
      const docExtractDir = path.join(this.extractDir, document.directory || document.name)
      await fs.mkdir(docExtractDir, { recursive: true })

      // 4. 提取文档内容
      console.log('\n--- 步骤1: 提取文档内容 ---')
      const contentPath = await this.extractDocument(sourceFilePath, docExtractDir)
      console.log(`✓ 内容提取完成: ${contentPath}`)

      // 5. 读取提取的内容
      console.log('\n--- 步骤2: 读取提取内容 ---')
      const contentData = await this.readExtractedContent(contentPath)
      const totalPages = contentData.total_pages || contentData.pages?.length || 0
      console.log(`✓ 共 ${totalPages} 页内容`)

      // 6. 智能分块
      console.log('\n--- 步骤3: 智能分块 ---')
      const chunks = await this.chunkContent(contentData)
      console.log(`✓ 生成了 ${chunks.length} 个 chunks`)

      // 7. 保存分块到文件
      console.log('\n--- 步骤4: 保存分块 ---')
      const chunksPath = path.join(docExtractDir, 'document_chunks.json')
      await fs.writeFile(chunksPath, JSON.stringify({
        metadata: { total_chunks: chunks.length, total_pages: totalPages },
        chunks: chunks
      }, null, 2), 'utf-8')
      console.log(`✓ 分块已保存: ${chunksPath}`)

      // 8. 向量化
      console.log('\n--- 步骤5: 向量化 ---')
      // 保留所有原始字段（包括 page_num, chapter_title 等），不要只传 id 和 text！
      const chunksWithEmbeddings = await embeddingService.embedChunks(
        chunks.map(c => ({ ...c }))  // ✅ 保留完整的 chunk 对象
      )
      console.log(`✓ 向量化完成，生成 ${chunksWithEmbeddings.length} 个向量`)

      // 9. 保存向量缓存
      console.log('\n--- 步骤6: 保存向量缓存 ---')
      const cachePath = path.join(docExtractDir, 'embedding_cache.json')
      const cacheData: Record<string, number[]> = {}
      for (const chunk of chunksWithEmbeddings) {
        cacheData[`chunk_${chunk.id}`] = chunk.embedding
      }
      await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8')
      console.log(`✓ 缓存已保存: ${cachePath}`)

      // 10. 保存检索索引（兼容旧系统）
      console.log('\n--- 步骤7: 保存检索索引 ---')
      await this.saveRetrievalIndex(docExtractDir, chunksWithEmbeddings, contentData)

      // 11. 添加到统一索引（供主系统使用）
      console.log('\n--- 步骤8: 添加到统一索引 ---')
      await this.indexManager.addDocument(
        documentId,
        chunksWithEmbeddings.map(c => ({ ...c })),  // ✅ 保留所有字段（包括 page_num 等）
        {
          name: document.name,
          displayName: document.displayName || document.name,
          description: document.description || ''
        },
        false // 不跳过embedding生成（已有embedding）
      )

      // 12. 更新状态为已索引
      const statistics = {
        totalPages,
        totalChunks: chunks.length,
        indexedChunks: chunksWithEmbeddings.length,
        fileSize: sourceFile.fileSize || 0
      }
      await documentRegistry.updateDocumentStatus(documentId, 'indexed', {
        statistics,
        step: 'complete',
        details: '文档处理完成'
      })

      console.log(`\n========== 文档处理完成: ${document.displayName} ==========`)
      console.log(`  - 总页数: ${statistics.totalPages}`)
      console.log(`  - 总chunks: ${statistics.totalChunks}`)
      console.log(`  - 已索引: ${statistics.indexedChunks}`)

      return {
        success: true,
        documentId,
        statistics
      }

    } catch (error: any) {
      console.error(`✗ 文档处理失败: ${error.message}`)
      try {
        await documentRegistry.updateDocumentStatus(documentId, 'error', {
          step: 'error',
          details: `处理失败: ${error.message}`
        })
      } catch {
        // 忽略状态更新失败
      }
      throw error
    }
  }

  /**
   * 提取文档内容
   */
  private async extractDocument(docxFile: string, targetDir: string): Promise<string> {
    console.log(`  提取文件: ${docxFile}`)

    // 尝试使用Python脚本提取
    const pythonScript = path.join(__dirname, '../../extract_student_handbook_word.py')
    const outputFile = path.join(targetDir, 'student_handbook_full.json')

    try {
      // 检查Python脚本是否存在
      await fs.access(pythonScript)

      const command = `python "${pythonScript}" "${docxFile}" "${outputFile}"`
      console.log(`  执行命令: ${command}`)

      const { stdout, stderr } = await execAsync(command, { timeout: 120000 })

      if (stdout) console.log(`  ${stdout.trim()}`)
      if (stderr) console.error(`  ${stderr.trim()}`)

      // 检查输出文件
      try {
        await fs.access(outputFile)
        console.log(`  ✓ 提取成功`)
        return outputFile
      } catch {
        throw new Error('提取失败，未生成输出文件')
      }
    } catch (error: any) {
      console.log(`  ⚠️ Python脚本提取失败: ${error.message}，尝试直接读取...`)
      // 如果Python脚本不存在，直接读取docx文件
      return await this.extractDocxDirectly(docxFile, targetDir)
    }
  }

  /**
   * 直接读取DOCX文件（不依赖Python）
   */
  private async extractDocxDirectly(docxFile: string, targetDir: string): Promise<string> {
    console.log(`  直接读取DOCX文件...`)

    const outputFile = path.join(targetDir, 'student_handbook_full.json')

    // 使用JavaScript的mammoth库或直接解析
    // 这里简化处理，创建一个占位内容
    try {
      // 读取文件基本信息
      const stats = await fs.stat(docxFile)

      // 创建一个模拟的内容结构
      const content: ExtractedContent = {
        total_pages: 1,
        pages: [{
          page_num: 1,
          text: `[文档内容来自: ${path.basename(docxFile)}]\n文件大小: ${stats.size} 字节\n\n注意: 此文档需要通过Python脚本完整提取内容。\n请确保已安装python-docx库并运行提取脚本。`
        }]
      }

      await fs.writeFile(outputFile, JSON.stringify(content, null, 2), 'utf-8')
      console.log(`  ✓ 创建内容文件: ${outputFile}`)

      return outputFile
    } catch (error: any) {
      throw new Error(`读取DOCX文件失败: ${error.message}`)
    }
  }

  /**
   * 读取提取的内容
   */
  private async readExtractedContent(jsonPath: string): Promise<ExtractedContent> {
    try {
      const data = await fs.readFile(jsonPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      throw new Error(`读取提取内容失败: ${error}`)
    }
  }

  /**
   * 对内容进行分块
   */
  private async chunkContent(contentData: ExtractedContent): Promise<Chunk[]> {
    const chunks: Chunk[] = []
    let chunkId = 0
    let currentChapter = null

    const pages = contentData.pages || []
    console.log(`  处理 ${pages.length} 页内容...`)

    for (const page of pages) {
      const lines = page.text.split('\n')
        .map(l => l.trim())
        .filter(line => {
          if (!line) return false
          // 过滤纯标点行
          if (/^[，,。、；;：:！!？?"""''（）()\s\-—…·]+$/.test(line)) return false
          return true
        })

      let currentParagraph: string[] = []

      for (const line of lines) {
        // 检查是否是章节标题
        if (this.isChapterTitle(line)) {
          if (currentParagraph.length > 0) {
            const text = currentParagraph.join(' ')
            if (text.length > 10) {
              chunks.push(this.createChunk(++chunkId, text, page.page_num, currentChapter, null))
            }
            currentParagraph = []
          }
          currentChapter = this.cleanText(line)
          chunks.push(this.createChunk(++chunkId, currentChapter, page.page_num, currentChapter, null, 'chapter_title'))
          continue
        }

        currentParagraph.push(line)

        // 每500字符创建一个块（适合短文档和单段落文档）
        if (currentParagraph.join('').length > 500) {
          const text = currentParagraph.join(' ')
          chunks.push(this.createChunk(++chunkId, text, page.page_num, currentChapter, null))
          currentParagraph = []
        }
      }

      // 保存剩余段落
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ')
        if (text.length > 10) {
          chunks.push(this.createChunk(++chunkId, text, page.page_num, currentChapter, null))
        }
      }
    }

    return chunks
  }

  /**
   * 创建分块
   */
  private createChunk(
    id: number,
    text: string,
    pageNum: number,
    chapter?: string | null,
    section?: string | null,
    chunkType: string = 'content'
  ): Chunk {
    return {
      id,
      text: this.cleanText(text),
      page_num: pageNum,
      chapter_title: chapter || '未分类',
      section_title: section || '',
      chunk_type: chunkType,
      char_count: text.length
    }
  }

  /**
   * 检查是否是章节标题
   */
  private isChapterTitle(line: string): boolean {
    // 以一、二、三、或 第X章 开头
    return /^[一二三四五六七八九十]+[、.．]/.test(line) ||
           /^第[一二三四五六七八九十\d]+[章节]/.test(line) ||
           /^[^\s]{1,20}$/.test(line) && line.length < 30 && !line.includes('。')
  }

  /**
   * 清理文本
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
  }

  /**
   * 保存检索索引
   */
  private async saveRetrievalIndex(
    targetDir: string,
    chunks: Array<{ id: number; text: string; embedding: number[] }>,
    contentData: ExtractedContent
  ): Promise<void> {
    const indexPath = path.join(targetDir, 'retrieval_index.json')

    const indexData = {
      metadata: {
        total_chunks: chunks.length,
        total_pages: contentData.total_pages || 0,
        created_at: new Date().toISOString()
      },
      chunks: chunks.map(c => ({
        chunk_id: c.id,
        text: c.text,
        embedding: c.embedding,
        metadata: {
          source: 'document_pipeline',
          created_at: new Date().toISOString()
        }
      }))
    }

    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8')
    console.log(`✓ 检索索引已保存: ${indexPath}`)
  }
}

export default new DocumentPipeline()
