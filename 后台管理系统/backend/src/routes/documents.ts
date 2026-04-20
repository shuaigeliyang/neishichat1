/**
 * 文档管理路由
 * @author 哈雷酱 (￣▽￣)／
 */

import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import {
  getDocuments,
  getDocument,
  uploadDocument,
  deleteDocument,
  getDocumentStatus,
  startProcessing,
  getStatistics,
  getDocumentChunks,
  getIndexStatus
} from '../controllers/documentRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// 文档根目录
const UPLOAD_DIR = path.resolve(__dirname, '../../../../相关文档')

// 配置文件上传 - 使用UUID避免中文编码问题
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueName = `${uuidv4()}${ext}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.docx', '.doc', '.pdf', '.txt', '.md']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件类型: ${ext}`))
    }
  }
})

// ========== 特殊路由（必须放在 :documentId 之前）==========

// 获取统计信息
router.get('/statistics', getStatistics)

// 获取统一索引状态
router.get('/index/status', getIndexStatus)

// ========== 文档管理 ==========

// 获取所有文档
router.get('/', getDocuments)

// 上传并注册文档
router.post('/upload', upload.single('file'), uploadDocument)

// ========== 文档ID相关操作 ==========

// 获取单个文档
router.get('/:documentId', getDocument)

// 删除文档
router.delete('/:documentId', deleteDocument)

// 获取文档处理状态
router.get('/:documentId/status', getDocumentStatus)

// 获取文档分块内容
router.get('/:documentId/chunks', getDocumentChunks)

// 开始处理文档
router.post('/:documentId/process', startProcessing)

export default router
