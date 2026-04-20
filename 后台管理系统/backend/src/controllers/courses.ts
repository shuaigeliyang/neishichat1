import { Request, Response } from 'express'
import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'

interface Course {
  course_id: number
  course_code: string
  course_name: string
  course_type?: string
  credits?: number
  total_hours?: number
  status?: number
  created_at?: string
}

export async function getCourses(req: Request, res: Response<PaginatedResponse<Course>>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const search = (req.query.search as string) || ''

    let query = 'SELECT * FROM courses'
    const params: any[] = []

    if (search) {
      query += ' WHERE course_name LIKE ? OR course_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY course_id DESC'

    const countResult = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM courses')
    const total = countResult[0]?.count || 0

    const offset = (page - 1) * pageSize
    const data = await executeQuery<Course>(`${query} LIMIT ${pageSize} OFFSET ${offset}`, params)

    res.json({ success: true, data, total, page, pageSize })
  } catch (error) {
    console.error('[Courses] getCourses error:', error)
    res.status(500).json({ success: false, error: '获取课程列表失败', data: [], total: 0, page: 1, pageSize: 10 })
  }
}

export async function getCourse(req: Request, res: Response<ApiResponse<Course>>) {
  try {
    const { id } = req.params
    const course = await executeOne<Course>('SELECT * FROM courses WHERE course_id = ?', [id])

    if (!course) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }

    res.json({ success: true, data: course })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程信息失败' })
  }
}

export async function createCourse(req: Request, res: Response<ApiResponse<Course>>) {
  try {
    const { course_code, course_name, course_type, credits, total_hours } = req.body

    if (!course_code || !course_name) {
      res.status(400).json({ success: false, error: '课程代码和名称不能为空' })
      return
    }

    const result = await executeUpdate(
      'INSERT INTO courses (course_code, course_name, course_type, credits, total_hours) VALUES (?, ?, ?, ?, ?)',
      [course_code, course_name, course_type || null, credits || null, total_hours || null]
    )

    const course = await executeOne<Course>('SELECT * FROM courses WHERE course_id = ?', [result.insertId])
    res.json({ success: true, data: course, message: '添加成功' })
  } catch (error: any) {
    console.error('[Courses] Create error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '课程代码已存在' : '添加失败' })
  }
}

export async function updateCourse(req: Request, res: Response<ApiResponse<Course>>) {
  try {
    const { id } = req.params
    const { course_code, course_name, course_type, credits, total_hours, status } = req.body

    await executeUpdate(
      'UPDATE courses SET course_code = ?, course_name = ?, course_type = ?, credits = ?, total_hours = ?, status = ? WHERE course_id = ?',
      [course_code, course_name, course_type, credits, total_hours, status, id]
    )

    const course = await executeOne<Course>('SELECT * FROM courses WHERE course_id = ?', [id])
    res.json({ success: true, data: course, message: '更新成功' })
  } catch (error: any) {
    console.error('[Courses] Update error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '课程代码已存在' : '更新失败' })
  }
}

export async function deleteCourse(req: Request, res: Response<ApiResponse<void>>) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM courses WHERE course_id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' })
  }
}
