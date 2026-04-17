import { Router } from 'express'
import { getStats } from '../controllers/stats.js'

const router = Router()

router.get('/', getStats)

export default router
