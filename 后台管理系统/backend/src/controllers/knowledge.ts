import { Request, Response } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import config = require('../config/index')
import { executeQuery } from '../utils/db.js'
import type { ApiResponse, KnowledgeFile } from '../types/index.js'

// 知识库文件存储（内存中，实际应该使用数据库）
const knowledgeFiles: Map<number, KnowledgeFile> = new Map()
let nextFileId = 1

// 初始化示例数据
knowledgeFiles.set(1, {
  id: 1,
  filename: 'student_handbook_full.json',
  file_type: 'application/json',
  file_size: 530424,
  chunk_count: 2341,
  upload_time: '2026-04-10 10:30:00',
  status: 'completed',
  description: '内江师范学院学生手册完整版',
})
knowledgeFiles.set(2, {
  id: 2,
  filename: 'retrieval_index.json',
  file_type: 'application/json',
  file_size: 12311813,
  chunk_count: 2341,
  upload_time: '2026-04-10 01:10:00',
  status: 'completed',
  description: '知识库检索索引',
})
nextFileId = 3

// 模拟文档块数据
const knowledgeChunks: Map<string, any[]> = new Map()
knowledgeChunks.set('1', [
  { id: 1, file_id: 1, content: '学生手册第一章：总则', metadata: { chapter: '第一章' } },
  { id: 2, file_id: 1, content: '学生手册第二章：学籍管理', metadata: { chapter: '第二章' } },
])

// 模拟分类数据
const knowledgeCategories = [
  { id: 1, name: '学生管理', parent_id: null, description: '学生相关管理规定' },
  { id: 2, name: '教学管理', parent_id: null, description: '教学相关管理规定' },
  { id: 3, name: '奖惩制度', parent_id: null, description: '奖励和惩罚相关规定' },
  { id: 4, name: '学籍管理', parent_id: 1, description: '学籍相关管理' },
  { id: 5, name: '日常管理', parent_id: 1, description: '学生日常行为管理' },
]

export async function getKnowledgeFiles(req: Request, res: Response<ApiResponse<KnowledgeFile[]>>): Promise<void> {
  try {
    const files = Array.from(knowledgeFiles.values()).sort((a, b) => b.id - a.id)

    res.json({
      success: true,
      data: files,
    })
  } catch (error) {
    console.error('Error fetching knowledge files:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch knowledge files',
    })
  }
}

export async function uploadKnowledgeFile(req: Request, res: Response<ApiResponse<KnowledgeFile>>): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      })
      return
    }

    const file = req.file
    const description = req.body.description

    console.log('Uploading knowledge file:', file.originalname)
    console.log('File size:', file.size)
    console.log('Description:', description)

    // 保存文件到上传目录
    const uploadDir = config.upload.dir
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, file.originalname)
    await fs.writeFile(filePath, file.buffer)

    // TODO: 调用主系统的文档处理API
    // 这里应该调用主系统的API来处理文档并生成向量索引

    const newFile: KnowledgeFile = {
      id: nextFileId++,
      filename: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      chunk_count: 0, // TODO: 从处理结果中获取
      upload_time: new Date().toLocaleString('zh-CN'),
      status: 'processing', // 初始状态为处理中
      description,
    }

    knowledgeFiles.set(newFile.id, newFile)

    // 模拟异步处理
    processKnowledgeFile(newFile.id, filePath)

    res.json({
      success: true,
      data: newFile,
      message: 'File uploaded successfully, processing...',
    })
  } catch (error) {
    console.error('Error uploading knowledge file:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to upload knowledge file',
    })
  }
}

// 异步处理知识库文件
async function processKnowledgeFile(fileId: number, filePath: string): Promise<void> {
  try {
    console.log(`Processing knowledge file ${fileId}...`)

    // TODO: 实际的文档处理逻辑
    // 1. 读取文件内容
    // 2. 分块处理
    // 3. 生成向量嵌入
    // 4. 更新检索索引

    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // 更新文件状态
    const file = knowledgeFiles.get(fileId)
    if (file) {
      file.status = 'completed'
      file.chunk_count = Math.floor(Math.random() * 100) + 50 // 模拟文档块数量
      knowledgeFiles.set(fileId, file)
    }

    console.log(`Knowledge file ${fileId} processed successfully`)
  } catch (error) {
    console.error(`Error processing knowledge file ${fileId}:`, error)

    // 更新文件状态为失败
    const file = knowledgeFiles.get(fileId)
    if (file) {
      file.status = 'failed'
      knowledgeFiles.set(fileId, file)
    }
  }
}

export async function deleteKnowledgeFile(req: Request, res: Response<ApiResponse<void>>): Promise<void> {
  try {
    const { id } = req.params
    const fileId = parseInt(id)

    const file = knowledgeFiles.get(fileId)
    if (!file) {
      res.status(404).json({
        success: false,
        error: 'Knowledge file not found',
      })
      return
    }

    // TODO: 删除主系统中的相关数据
    // 1. 从检索索引中移除
    // 2. 删除文档块数据
    // 3. 删除文件本身

    knowledgeFiles.delete(fileId)

    res.json({
      success: true,
      message: 'Knowledge file deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting knowledge file:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete knowledge file',
    })
  }
}

export async function rebuildKnowledgeIndex(req: Request, res: Response<ApiResponse<{ message: string }>>): Promise<void> {
  try {
    console.log('Rebuilding knowledge index...')

    // TODO: 调用主系统的API重建索引
    // 1. 重新读取所有知识库文件
    // 2. 重新分块和向量化
    // 3. 重建检索索引

    // 模拟重建时间
    await new Promise((resolve) => setTimeout(resolve, 2000))

    res.json({
      success: true,
      data: {
        message: 'Knowledge index rebuilt successfully',
      },
      message: '重建完成',
    })
  } catch (error) {
    console.error('Error rebuilding knowledge index:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to rebuild knowledge index',
    })
  }
}

// 获取文档块列表
export async function getKnowledgeChunks(req: Request, res: Response<ApiResponse<any[]>>): Promise<void> {
  try {
    const { id } = req.params
    const fileId = id

    const chunks = knowledgeChunks.get(fileId) || []

    res.json({
      success: true,
      data: chunks,
    })
  } catch (error) {
    console.error('Error fetching knowledge chunks:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch knowledge chunks',
    })
  }
}

// 获取分类列表
export async function getKnowledgeCategories(req: Request, res: Response<ApiResponse<any[]>>): Promise<void> {
  try {
    res.json({
      success: true,
      data: knowledgeCategories,
    })
  } catch (error) {
    console.error('Error fetching knowledge categories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch knowledge categories',
    })
  }
}

// 搜索知识库
export async function searchKnowledge(req: Request, res: Response<ApiResponse<any[]>>): Promise<void> {
  try {
    const { q } = req.query
    const query = q as string

    if (!query) {
      res.status(400).json({
        success: false,
        error: 'Search query is required',
      })
      return
    }

    // TODO: 实际的向量搜索
    // 这里应该调用主系统的搜索API，使用向量相似度匹配
    // 模拟搜索结果
    const mockResults = [
      {
        chunk_id: 1,
        content: `关于"${query}"的相关规定...`,
        score: 0.95,
        metadata: { file_id: 1, file_name: '学生手册.pdf' },
      },
      {
        chunk_id: 2,
        content: `${query}的具体实施细则如下...`,
        score: 0.87,
        metadata: { file_id: 1, file_name: '学生手册.pdf' },
      },
    ]

    res.json({
      success: true,
      data: mockResults,
    })
  } catch (error) {
    console.error('Error searching knowledge:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to search knowledge',
    })
  }
}

// 创建分类
export async function createKnowledgeCategory(req: Request, res: Response<ApiResponse<any>>): Promise<void> {
  try {
    const { name, parent_id, description } = req.body

    // TODO: 实际的数据库插入操作
    const newCategory = {
      id: knowledgeCategories.length + 1,
      name,
      parent_id: parent_id || null,
      description: description || '',
    }

    knowledgeCategories.push(newCategory)

    res.json({
      success: true,
      data: newCategory,
      message: '分类创建成功',
    })
  } catch (error) {
    console.error('Error creating knowledge category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create knowledge category',
    })
  }
}

// 更新分类
export async function updateKnowledgeCategory(req: Request, res: Response<ApiResponse<void>>): Promise<void> {
  try {
    const { id } = req.params
    const categoryId = parseInt(id)
    const { name, parent_id, description } = req.body

    const category = knowledgeCategories.find(c => c.id === categoryId)
    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Category not found',
      })
      return
    }

    // TODO: 实际的数据库更新操作
    category.name = name || category.name
    category.parent_id = parent_id !== undefined ? parent_id : category.parent_id
    category.description = description !== undefined ? description : category.description

    res.json({
      success: true,
      message: '分类更新成功',
    })
  } catch (error) {
    console.error('Error updating knowledge category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update knowledge category',
    })
  }
}

// 删除分类
export async function deleteKnowledgeCategory(req: Request, res: Response<ApiResponse<void>>): Promise<void> {
  try {
    const { id } = req.params
    const categoryId = parseInt(id)

    const index = knowledgeCategories.findIndex(c => c.id === categoryId)
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Category not found',
      })
      return
    }

    // TODO: 实际的数据库删除操作
    knowledgeCategories.splice(index, 1)

    res.json({
      success: true,
      message: '分类删除成功',
    })
  } catch (error) {
    console.error('Error deleting knowledge category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete knowledge category',
    })
  }
}
