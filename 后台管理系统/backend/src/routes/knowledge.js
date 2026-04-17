import { Router } from 'express'
import {
  getKnowledgeFiles,
  uploadKnowledgeFile,
  deleteKnowledgeFile,
  rebuildKnowledgeIndex,
  getKnowledgeChunks,
  getKnowledgeCategories,
  createKnowledgeCategory,
  updateKnowledgeCategory,
  deleteKnowledgeCategory,
  searchKnowledge,
} from '../controllers/knowledge.js'
import {
  queryRAG,
  getIndexStatus,
  searchDocuments,
} from '../controllers/rag.js'
import upload from '../middleware/upload.js'

const router = Router()

// 文件管理
router.get('/files', getKnowledgeFiles)
router.post('/upload', upload.single('file'), uploadKnowledgeFile)
router.delete('/files/:id', deleteKnowledgeFile)
router.get('/files/:id/chunks', getKnowledgeChunks)
router.post('/rebuild', rebuildKnowledgeIndex)

// 分类管理
router.get('/categories', getKnowledgeCategories)
router.post('/categories', createKnowledgeCategory)
router.put('/categories/:id', updateKnowledgeCategory)
router.delete('/categories/:id', deleteKnowledgeCategory)

// 搜索
router.get('/search', searchKnowledge)

// RAG问答
router.post('/query', queryRAG)
router.get('/status', getIndexStatus)
router.get('/documents/search', searchDocuments)

export default router
