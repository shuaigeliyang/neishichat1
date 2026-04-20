import { Request, Response } from 'express'
import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'
import type { ApiResponse, PaginatedResponse, Major } from '../types/index.js'

export async function getMajors(req: Request, res: Response<PaginatedResponse<Major>>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 50
    const search = (req.query.search as string) || ''

    let query = `SELECT m.*, c.college_name FROM majors m LEFT JOIN colleges c ON m.college_id = c.college_id`
    const params: unknown[] = []

    if (search) {
      query += ' WHERE m.major_name LIKE ? OR m.major_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY m.major_id DESC'

    const countResult = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM majors m ${search ? 'WHERE m.major_name LIKE ? OR m.major_code LIKE ?' : ''}`,
      search ? params : []
    )
    const total = countResult[0]?.count || 0

    const offset = (page - 1) * pageSize
    const data = await executeQuery<Major>(`${query} LIMIT ${pageSize} OFFSET ${offset}`, params)

    res.json({ success: true, data, total, page, pageSize })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取专业列表失败', data: [], total: 0, page: 1, pageSize: 10 })
  }
}

export async function createMajor(req: Request, res: Response<ApiResponse<Major>>) {
  try {
    const { major_code, major_name, college_id, degree_type } = req.body

    if (!major_code || !major_name || !college_id || !degree_type) {
      res.status(400).json({ success: false, error: '请填写所有必填字段' })
      return
    }

    const result = await executeUpdate(
      'INSERT INTO majors (major_code, major_name, college_id, degree_type) VALUES (?, ?, ?, ?)',
      [major_code, major_name, college_id, degree_type]
    )

    const major = await executeOne<Major>('SELECT * FROM majors WHERE major_id = ?', [result.insertId])
    res.json({ success: true, data: major, message: '添加成功' })
  } catch (error: any) {
    console.error('[Majors] Create error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '专业代码已存在' : '添加失败' })
  }
}

export async function updateMajor(req: Request, res: Response<ApiResponse<Major>>) {
  try {
    const { id } = req.params
    const { major_code, major_name, college_id, degree_type } = req.body

    await executeUpdate(
      'UPDATE majors SET major_code = ?, major_name = ?, college_id = ?, degree_type = ? WHERE major_id = ?',
      [major_code, major_name, college_id, degree_type, id]
    )

    const major = await executeOne<Major>('SELECT * FROM majors WHERE major_id = ?', [id])
    res.json({ success: true, data: major, message: '更新成功' })
  } catch (error: any) {
    console.error('[Majors] Update error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '专业代码已存在' : '更新失败' })
  }
}

export async function deleteMajor(req: Request, res: Response<ApiResponse<void>>) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM majors WHERE major_id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' })
  }
}
