import { Router } from 'express'
import { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher } from '../controllers/teachers.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getTeachers)
router.get('/:id', getTeacher)
router.post('/', createTeacher)
router.put('/:id', updateTeacher)
router.delete('/:id', deleteTeacher)

export default router
