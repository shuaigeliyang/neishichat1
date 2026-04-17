import { Router } from 'express'
import statsRoutes from './stats.js'
import studentRoutes from './students.js'
import teacherRoutes from './teachers.js'
import courseRoutes from './courses.js'
import knowledgeRoutes from './knowledge.js'
import knowledgeManagementRoutes from './knowledgeManagement.js'
import settingsRoutes from './settings.js'
import collegeRoutes from './colleges.js'
import majorRoutes from './majors.js'
import classRoutes from './classes.js'
import documentRegistryRoutes from './documentRegistry.js'
import unifiedRagRoutes from './unifiedRag.js'

const router = Router()

router.use('/stats', statsRoutes)
router.use('/students', studentRoutes)
router.use('/teachers', teacherRoutes)
router.use('/courses', courseRoutes)
router.use('/knowledge', knowledgeRoutes)
router.use('/knowledge-management', knowledgeManagementRoutes)
router.use('/documents', documentRegistryRoutes)
router.use('/rag', unifiedRagRoutes)
router.use('/settings', settingsRoutes)
router.use('/colleges', collegeRoutes)
router.use('/majors', majorRoutes)
router.use('/classes', classRoutes)

export default router
