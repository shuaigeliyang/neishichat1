import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'

export async function getStudents(req, res) {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const search = req.query.search || ''

    let query = `
      SELECT s.*, c.class_name, m.major_name, col.college_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
    `
    const params = []

    if (search) {
      query += ' WHERE s.name LIKE ? OR s.student_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY s.student_id DESC'

    // 获取总数
    const countQuery = `SELECT COUNT(*) as count FROM students s ${search ? 'WHERE s.name LIKE ? OR s.student_code LIKE ?' : ''}`
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
    console.error('Error fetching students:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })
  }
}

export async function getStudent(req, res) {
  try {
    const { id } = req.params
    const student = await executeOne(
      `SELECT s.*, c.class_name, m.major_name, col.college_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.class_id
       LEFT JOIN majors m ON c.major_id = m.major_id
       LEFT JOIN colleges col ON m.college_id = col.college_id
       WHERE s.student_id = ?`,
      [id]
    )

    if (!student) {
      res.status(404).json({
        success: false,
        error: 'Student not found',
      })
      return
    }

    res.json({
      success: true,
      data: student,
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student',
    })
  }
}

export async function createStudent(req, res) {
  try {
    const data = req.body

    const result = await executeUpdate(`
      INSERT INTO students (student_code, name, gender, class_id, phone, email, enrollment_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_code,
      data.name,
      data.gender || '男',
      data.class_id,
      data.phone || null,
      data.email || null,
      data.enrollment_date || new Date().toISOString().split('T')[0],
      data.status || '在读',
    ])

    // 获取新插入的学生
    const studentId = result.insertId
    const student = await executeOne('SELECT * FROM students WHERE student_id = ?', [studentId])

    res.json({
      success: true,
      data: student,
      message: 'Student created successfully',
    })
  } catch (error) {
    console.error('Error creating student:', error)
    res.status(500).json({
      success: false,
      error: error.code === 'ER_DUP_ENTRY' ? '学号已存在' : 'Failed to create student',
    })
  }
}

export async function updateStudent(req, res) {
  try {
    const { id } = req.params
    const data = req.body

    await executeUpdate(`
      UPDATE students
      SET student_code = ?, name = ?, gender = ?, class_id = ?, phone = ?, email = ?, status = ?
      WHERE student_id = ?
    `, [
      data.student_code,
      data.name,
      data.gender,
      data.class_id,
      data.phone,
      data.email,
      data.status,
      id,
    ])

    const student = await executeOne('SELECT * FROM students WHERE student_id = ?', [id])

    res.json({
      success: true,
      data: student,
      message: 'Student updated successfully',
    })
  } catch (error) {
    console.error('Error updating student:', error)
    res.status(500).json({
      success: false,
      error: error.code === 'ER_DUP_ENTRY' ? '学号已存在' : 'Failed to update student',
    })
  }
}

export async function deleteStudent(req, res) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM students WHERE student_id = ?', [id])

    res.json({
      success: true,
      message: 'Student deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting student:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
    })
  }
}
