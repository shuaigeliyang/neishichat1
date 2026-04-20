import { Request, Response } from 'express'
import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'
import type { ApiResponse, PaginatedResponse, College } from '../types/index.js'

export async function getColleges(req: Request, res: Response<PaginatedResponse<College>>) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 50
    const search = (req.query.search as string) || ''

    let query = 'SELECT * FROM colleges'
    const params: unknown[] = []

    if (search) {
      query += ' WHERE college_name LIKE ? OR college_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY college_id DESC'

    const countResult = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM colleges ${search ? 'WHERE college_name LIKE ? OR college_code LIKE ?' : ''}`,
      search ? params : []
    )
    const total = countResult[0]?.count || 0

    const offset = (page - 1) * pageSize
    const data = await executeQuery<College>(`${query} LIMIT ${pageSize} OFFSET ${offset}`, params)

    res.json({ success: true, data, total, page, pageSize })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取学院列表失败', data: [], total: 0, page: 1, pageSize: 10 })
  }
}

export async function createCollege(req: Request, res: Response<ApiResponse<College>>) {
  try {
    const { college_code, college_name, dean_name, phone, email } = req.body

    if (!college_code || !college_name) {
      res.status(400).json({ success: false, error: '学院代码和名称不能为空' })
      return
    }

    const result = await executeUpdate(
      'INSERT INTO colleges (college_code, college_name, dean_name, phone, email) VALUES (?, ?, ?, ?, ?)',
      [college_code, college_name, dean_name || null, phone || null, email || null]
    )

    const college = await executeOne<College>('SELECT * FROM colleges WHERE college_id = ?', [result.insertId])
    res.json({ success: true, data: college, message: '添加成功' })
  } catch (error: any) {
    console.error('[Colleges] Create error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '学院代码已存在' : '添加失败' })
  }
}

export async function updateCollege(req: Request, res: Response<ApiResponse<College>>) {
  try {
    const { id } = req.params
    const { college_code, college_name, dean_name, phone, email } = req.body

    await executeUpdate(
      'UPDATE colleges SET college_code = ?, college_name = ?, dean_name = ?, phone = ?, email = ? WHERE college_id = ?',
      [college_code, college_name, dean_name, phone, email, id]
    )

    const college = await executeOne<College>('SELECT * FROM colleges WHERE college_id = ?', [id])
    res.json({ success: true, data: college, message: '更新成功' })
  } catch (error: any) {
    console.error('[Colleges] Update error:', error)
    res.status(500).json({ success: false, error: error.code === 'ER_DUP_ENTRY' ? '学院代码已存在' : '更新失败' })
  }
}

export async function deleteCollege(req: Request, res: Response<ApiResponse<void>>) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM colleges WHERE college_id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' })
  }
}
