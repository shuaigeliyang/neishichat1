import { Request, Response } from 'express'
import { executeQuery } from '../utils/db.js'
import type { ApiResponse } from '../types/index.js'

export async function getStats(req: Request, res: Response<ApiResponse<object>>) {
  try {
    const [students] = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM students')
    const [teachers] = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM teachers')
    const [courses] = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM courses')
    const [colleges] = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM colleges')
    const [majors] = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM majors')
    const [classes] = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM classes')

    res.json({
      success: true,
      data: {
        students: students?.count || 0,
        teachers: teachers?.count || 0,
        courses: courses?.count || 0,
        colleges: colleges?.count || 0,
        majors: majors?.count || 0,
        classes: classes?.count || 0,
      },
    })
  } catch (error) {
    console.error('[Stats] Error:', error)
    res.status(500).json({ success: false, error: '获取统计数据失败' })
  }
}
