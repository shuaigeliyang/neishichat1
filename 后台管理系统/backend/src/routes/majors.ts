import { Router } from 'express'
import { getMajors, createMajor, updateMajor, deleteMajor } from '../controllers/majors.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getMajors)
router.post('/', createMajor)
router.put('/:id', updateMajor)
router.delete('/:id', deleteMajor)

export default router
