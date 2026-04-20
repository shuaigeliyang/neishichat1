import { Router } from 'express'
import authRoutes from './auth.js'
import statsRoutes from './stats.js'
import studentRoutes from './students.js'
import teacherRoutes from './teachers.js'
import courseRoutes from './courses.js'
import collegeRoutes from './colleges.js'
import majorRoutes from './majors.js'
import classRoutes from './classes.js'
import documentRoutes from './documents.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/stats', statsRoutes)
router.use('/students', studentRoutes)
router.use('/teachers', teacherRoutes)
router.use('/courses', courseRoutes)
router.use('/colleges', collegeRoutes)
router.use('/majors', majorRoutes)
router.use('/classes', classRoutes)
router.use('/documents', documentRoutes)

export default router
