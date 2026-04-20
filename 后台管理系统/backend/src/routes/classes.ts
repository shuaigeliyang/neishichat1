import { Router } from 'express'
import { getClasses, createClass, updateClass, deleteClass } from '../controllers/classes.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getClasses)
router.post('/', createClass)
router.put('/:id', updateClass)
router.delete('/:id', deleteClass)

export default router
