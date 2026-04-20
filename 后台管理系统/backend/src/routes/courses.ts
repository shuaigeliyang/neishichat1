import { Router } from 'express'
import { getCourses, getCourse, createCourse, updateCourse, deleteCourse } from '../controllers/courses.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getCourses)
router.get('/:id', getCourse)
router.post('/', createCourse)
router.put('/:id', updateCourse)
router.delete('/:id', deleteCourse)

export default router
