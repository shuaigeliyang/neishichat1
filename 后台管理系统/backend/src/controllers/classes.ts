import { Request, Response } from 'express'
import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'
import type { ApiResponse, PaginatedResponse, Class } from '../types/index.js'

export async function getClasses(req: Request, res: Response<PaginatedResponse<Class>>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 50
    const search = (req.query.search as string) || ''

    let query = `
      SELECT cl.*, m.major_name, c.college_name,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = cl.class_id) as student_count
      FROM classes cl
      LEFT JOIN majors m ON cl.major_id = m.major_id
      LEFT JOIN colleges c ON m.college_id = c.college_id
    `
    const params: unknown[] = []

    if (search) {
      query += ' WHERE cl.class_name LIKE ? OR cl.class_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY cl.class_id DESC'

    const countResult = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM classes cl ${search ? 'WHERE cl.class_name LIKE ? OR cl.class_code LIKE ?' : ''}`,
      search ? params : []
    )
    const total = countResult[0]?.count || 0

    const offset = (page - 1) * pageSize
    const data = await executeQuery<Class>(`${query} LIMIT ${pageSize} OFFSET ${offset}`, params)

    res.json({ success: true, data, total, page, pageSize })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取班级列表失败', data: [], total: 0, page: 1, pageSize: 10 })
  }
}

export async function createClass(req: Request, res: Response<ApiResponse<Class>>) {
  try {
    const { class_code, class_name, major_id, enrollment_year } = req.body

    if (!class_code || !class_name || !major_id) {
      res.status(400).json({ success: false, error: '请填写所有必填字段' })
      return
    }

    const result = await executeUpdate(
      'INSERT INTO classes (class_code, class_name, major_id, enrollment_year) VALUES (?, ?, ?, ?)',
      [class_code, class_name, major_id, enrollment_year || new Date().getFullYear()]
    )

    const cls = await executeOne<Class>('SELECT * FROM classes WHERE class_id = ?', [result.insertId])
    res.json({ success: true, data: cls, message: '添加成功' })
  } catch (error: any) {
    console.error('[Classes] Create error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '班级代码已存在' : '添加失败' })
  }
}

export async function updateClass(req: Request, res: Response<ApiResponse<Class>>) {
  try {
    const { id } = req.params
    const { class_code, class_name, major_id, enrollment_year } = req.body

    await executeUpdate(
      'UPDATE classes SET class_code = ?, class_name = ?, major_id = ?, enrollment_year = ? WHERE class_id = ?',
      [class_code, class_name, major_id, enrollment_year, id]
    )

    const cls = await executeOne<Class>('SELECT * FROM classes WHERE class_id = ?', [id])
    res.json({ success: true, data: cls, message: '更新成功' })
  } catch (error: any) {
    console.error('[Classes] Update error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '班级代码已存在' : '更新失败' })
  }
}

export async function deleteClass(req: Request, res: Response<ApiResponse<void>>) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM classes WHERE class_id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' })
  }
}
