import { Request, Response } from 'express'
import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'
import type { ApiResponse, PaginatedResponse, Student } from '../types/index.js'

export async function getStudents(req: Request, res: Response<PaginatedResponse<Student>>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const search = (req.query.search as string) || ''

    let query = `
      SELECT s.*, c.class_name, m.major_name, col.college_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
    `
    const params: unknown[] = []

    if (search) {
      query += ' WHERE s.name LIKE ? OR s.student_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY s.student_id DESC'

    const countQuery = `SELECT COUNT(*) as count FROM students s ${search ? 'WHERE s.name LIKE ? OR s.student_code LIKE ?' : ''}`
    const countResult = await executeQuery<{ count: number }>(countQuery, search ? params : [])
    const total = countResult[0]?.count || 0

    const offset = (page - 1) * pageSize
    const paginatedQuery = `${query} LIMIT ${pageSize} OFFSET ${offset}`
    const data = await executeQuery<Student>(paginatedQuery, params)

    res.json({ success: true, data, total, page, pageSize })
  } catch (error) {
    console.error('[Students] Fetch error:', error)
    res.status(500).json({ success: false, error: '获取学生列表失败', data: [], total: 0, page: 1, pageSize: 10 })
  }
}

export async function getStudent(req: Request, res: Response<ApiResponse<Student>>) {
  try {
    const { id } = req.params
    const student = await executeOne<Student>(
      `SELECT s.*, c.class_name, m.major_name, col.college_name
       FROM students s LEFT JOIN classes c ON s.class_id = c.class_id
       LEFT JOIN majors m ON c.major_id = m.major_id
       LEFT JOIN colleges col ON m.college_id = col.college_id
       WHERE s.student_id = ?`, [id]
    )

    if (!student) {
      res.status(404).json({ success: false, error: '学生不存在' })
      return
    }

    res.json({ success: true, data: student })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取学生信息失败' })
  }
}

export async function createStudent(req: Request, res: Response<ApiResponse<Student>>) {
  try {
    const { student_code, name, gender = '男', class_id, phone, email, enrollment_date, status = '在读' } = req.body

    if (!student_code || !name || !class_id) {
      res.status(400).json({ success: false, error: '学号、姓名和班级不能为空' })
      return
    }

    const result = await executeUpdate(
      `INSERT INTO students (student_code, name, gender, class_id, phone, email, enrollment_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_code, name, gender, class_id, phone || null, email || null, enrollment_date || new Date().toISOString().split('T')[0], status]
    )

    const student = await executeOne<Student>('SELECT * FROM students WHERE student_id = ?', [result.insertId])
    res.json({ success: true, data: student, message: '添加成功' })
  } catch (error: any) {
    console.error('[Students] Create error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '学号已存在' : '添加失败' })
  }
}

export async function updateStudent(req: Request, res: Response<ApiResponse<Student>>) {
  try {
    const { id } = req.params
    const { student_code, name, gender, class_id, phone, email, status } = req.body

    await executeUpdate(
      `UPDATE students SET student_code = ?, name = ?, gender = ?, class_id = ?, phone = ?, email = ?, status = ? WHERE student_id = ?`,
      [student_code, name, gender, class_id, phone, email, status, id]
    )

    const student = await executeOne<Student>('SELECT * FROM students WHERE student_id = ?', [id])
    res.json({ success: true, data: student, message: '更新成功' })
  } catch (error: any) {
    console.error('[Students] Update error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '学号已存在' : '更新失败' })
  }
}

export async function deleteStudent(req: Request, res: Response<ApiResponse<void>>) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM students WHERE student_id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' })
  }
}
