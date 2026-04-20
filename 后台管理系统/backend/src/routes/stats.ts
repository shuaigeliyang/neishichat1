import { Router } from 'express'
import { getStats } from '../controllers/stats.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getStats)

export default router
