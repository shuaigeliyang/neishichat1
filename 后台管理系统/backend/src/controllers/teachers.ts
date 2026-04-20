import { Request, Response } from 'express'
import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'

interface Teacher {
  teacher_id: number
  teacher_code: string
  name: string
  gender?: string
  college_id: number
  title?: string
  phone?: string
  email?: string
  status?: number
  created_at?: string
}

export async function getTeachers(req: Request, res: Response<PaginatedResponse<Teacher>>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const search = (req.query.search as string) || ''

    let query = `
      SELECT t.*, c.college_name
      FROM teachers t
      LEFT JOIN colleges c ON t.college_id = c.college_id
    `
    const params: any[] = []

    if (search) {
      query += ' WHERE t.name LIKE ? OR t.teacher_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY t.teacher_id DESC'

    const countResult = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM teachers')
    const total = countResult[0]?.count || 0

    const offset = (page - 1) * pageSize
    const data = await executeQuery<Teacher>(`${query} LIMIT ${pageSize} OFFSET ${offset}`, params)

    res.json({ success: true, data, total, page, pageSize })
  } catch (error) {
    console.error('[Teachers] getTeachers error:', error)
    res.status(500).json({ success: false, error: '获取教师列表失败', data: [], total: 0, page: 1, pageSize: 10 })
  }
}

export async function getTeacher(req: Request, res: Response<ApiResponse<Teacher>>) {
  try {
    const { id } = req.params
    const teacher = await executeOne<Teacher>(
      `SELECT t.*, c.college_name FROM teachers t LEFT JOIN colleges c ON t.college_id = c.college_id WHERE t.teacher_id = ?`,
      [id]
    )

    if (!teacher) {
      res.status(404).json({ success: false, error: '教师不存在' })
      return
    }

    res.json({ success: true, data: teacher })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教师信息失败' })
  }
}

export async function createTeacher(req: Request, res: Response<ApiResponse<Teacher>>) {
  try {
    const { teacher_code, name, gender, college_id, phone, email, title } = req.body

    if (!teacher_code || !name || !college_id) {
      res.status(400).json({ success: false, error: '工号、姓名和学院不能为空' })
      return
    }

    const result = await executeUpdate(
      'INSERT INTO teachers (teacher_code, name, gender, college_id, phone, email, title) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [teacher_code, name, gender || null, college_id, phone || null, email || null, title || null]
    )

    const teacher = await executeOne<Teacher>('SELECT * FROM teachers WHERE teacher_id = ?', [result.insertId])
    res.json({ success: true, data: teacher, message: '添加成功' })
  } catch (error: any) {
    console.error('[Teachers] Create error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '工号已存在' : '添加失败' })
  }
}

export async function updateTeacher(req: Request, res: Response<ApiResponse<Teacher>>) {
  try {
    const { id } = req.params
    const { teacher_code, name, gender, college_id, phone, email, title, status } = req.body

    await executeUpdate(
      'UPDATE teachers SET teacher_code = ?, name = ?, gender = ?, college_id = ?, phone = ?, email = ?, title = ?, status = ? WHERE teacher_id = ?',
      [teacher_code, name, gender, college_id, phone, email, title, status, id]
    )

    const teacher = await executeOne<Teacher>('SELECT * FROM teachers WHERE teacher_id = ?', [id])
    res.json({ success: true, data: teacher, message: '更新成功' })
  } catch (error: any) {
    console.error('[Teachers] Update error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '工号已存在' : '更新失败' })
  }
}

export async function deleteTeacher(req: Request, res: Response<ApiResponse<void>>) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM teachers WHERE teacher_id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' })
  }
}
