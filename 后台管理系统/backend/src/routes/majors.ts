import { Router } from 'express'
import {
  getMajors,
  getMajorById,
  createMajor,
  updateMajor,
  deleteMajor,
} from '../controllers/majors.js'

const router = Router()

router.get('/', getMajors)
router.get('/:id', getMajorById)
router.post('/', createMajor)
router.put('/:id', updateMajor as any)
router.delete('/:id', deleteMajor)

export default router
