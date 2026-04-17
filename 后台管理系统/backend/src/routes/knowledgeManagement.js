import { Router } from 'express'
import {
  getSupportedModels,
  validateApiKey,
  getIndexStatus,
  getBuildProgress,
  deleteDocumentIndex,
  deleteAllIndex,
  buildIndex,
} from '../controllers/knowledgeManagement.js'

const router = Router()

// API密钥管理
router.get('/models', getSupportedModels)
router.post('/keys/validate', validateApiKey)

// 索引管理
router.get('/index/status', getIndexStatus)
router.get('/index/progress/:taskId', getBuildProgress)
router.post('/index/build', buildIndex)
router.delete('/index/:documentId', deleteDocumentIndex)
router.delete('/index/all', deleteAllIndex)

export default router
