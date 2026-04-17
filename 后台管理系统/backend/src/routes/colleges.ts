import { Router } from 'express'
import {
  getColleges,
  getCollegeById,
  createCollege,
  updateCollege,
  deleteCollege,
} from '../controllers/colleges.js'

const router = Router()

router.get('/', getColleges)
router.get('/:id', getCollegeById)
router.post('/', createCollege)
router.put('/:id', updateCollege as any)
router.delete('/:id', deleteCollege)

export default router
