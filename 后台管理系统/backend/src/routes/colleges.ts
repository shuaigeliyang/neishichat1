import { Router } from 'express'
import { getColleges, createCollege, updateCollege, deleteCollege } from '../controllers/colleges.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getColleges)
router.post('/', createCollege)
router.put('/:id', updateCollege)
router.delete('/:id', deleteCollege)

export default router
