import { Router } from 'express'
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} from '../controllers/classes.js'

const router = Router()

router.get('/', getClasses)
router.get('/:id', getClassById)
router.post('/', createClass)
router.put('/:id', updateClass as any)
router.delete('/:id', deleteClass)

export default router
