import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'

export async function getTeachers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const search = req.query.search || ''

    let query = `
      SELECT t.*, c.college_name
      FROM teachers t
      LEFT JOIN colleges c ON t.college_id = c.college_id
    `
    const params = []

    if (search) {
      query += ' WHERE t.name LIKE ? OR t.teacher_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY t.teacher_id DESC'

    // 获取总数
    const countQuery = `SELECT COUNT(*) as count FROM teachers t ${search ? 'WHERE t.name LIKE ? OR t.teacher_code LIKE ?' : ''}`
    const countResult = await executeQuery(countQuery, search ? params : [])
    const total = countResult[0]?.count || 0

    // 获取分页数据
    const offset = (page - 1) * pageSize
    const paginatedQuery = `${query} LIMIT ${pageSize} OFFSET ${offset}`
    const data = await executeQuery(paginatedQuery, params)

    res.json({
      success: true,
      data,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teachers',
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })
  }
}

export async function getTeacher(req, res) {
  try {
    const { id } = req.params
    const teacher = await executeOne(
      `SELECT t.*, c.college_name
       FROM teachers t
       LEFT JOIN colleges c ON t.college_id = c.college_id
       WHERE t.teacher_id = ?`,
      [id]
    )

    if (!teacher) {
      res.status(404).json({
        success: false,
        error: 'Teacher not found',
      })
      return
    }

    res.json({
      success: true,
      data: teacher,
    })
  } catch (error) {
    console.error('Error fetching teacher:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teacher',
    })
  }
}

export async function createTeacher(req, res) {
  try {
    const data = req.body

    const result = await executeUpdate(`
      INSERT INTO teachers (teacher_code, name, gender, college_id, title, phone, email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.teacher_code,
      data.name,
      data.gender || '男',
      data.college_id,
      data.title || null,
      data.phone || null,
      data.email || null,
      data.status !== undefined ? data.status : 1,
    ])

    const teacherId = result.insertId
    const teacher = await executeOne('SELECT * FROM teachers WHERE teacher_id = ?', [teacherId])

    res.json({
      success: true,
      data: teacher,
      message: 'Teacher created successfully',
    })
  } catch (error) {
    console.error('Error creating teacher:', error)
    res.status(500).json({
      success: false,
      error: error.code === 'ER_DUP_ENTRY' ? '工号已存在' : 'Failed to create teacher',
    })
  }
}

export async function updateTeacher(req, res) {
  try {
    const { id } = req.params
    const data = req.body

    await executeUpdate(`
      UPDATE teachers
      SET teacher_code = ?, name = ?, gender = ?, college_id = ?, title = ?, phone = ?, email = ?, status = ?
      WHERE teacher_id = ?
    `, [
      data.teacher_code,
      data.name,
      data.gender,
      data.college_id,
      data.title,
      data.phone,
      data.email,
      data.status,
      id,
    ])

    const teacher = await executeOne('SELECT * FROM teachers WHERE teacher_id = ?', [id])

    res.json({
      success: true,
      data: teacher,
      message: 'Teacher updated successfully',
    })
  } catch (error) {
    console.error('Error updating teacher:', error)
    res.status(500).json({
      success: false,
      error: error.code === 'ER_DUP_ENTRY' ? '工号已存在' : 'Failed to update teacher',
    })
  }
}

export async function deleteTeacher(req, res) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM teachers WHERE teacher_id = ?', [id])

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting teacher:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete teacher',
    })
  }
}
