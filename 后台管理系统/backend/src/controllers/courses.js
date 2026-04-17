import { executeQuery, executeOne, executeUpdate } from '../utils/db.js'

export async function getCourses(req, res) {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 10
    const search = req.query.search || ''

    let query = 'SELECT * FROM courses'
    const params = []

    if (search) {
      query += ' WHERE course_name LIKE ? OR course_code LIKE ?'
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY course_id DESC'

    // 获取总数
    const countQuery = `SELECT COUNT(*) as count FROM courses ${search ? 'WHERE course_name LIKE ? OR course_code LIKE ?' : ''}`
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
    console.error('Error fetching courses:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses',
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })
  }
}

export async function getCourse(req, res) {
  try {
    const { id } = req.params
    const course = await executeOne('SELECT * FROM courses WHERE course_id = ?', [id])

    if (!course) {
      res.status(404).json({
        success: false,
        error: 'Course not found',
      })
      return
    }

    res.json({
      success: true,
      data: course,
    })
  } catch (error) {
    console.error('Error fetching course:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course',
    })
  }
}

export async function createCourse(req, res) {
  try {
    const data = req.body

    const result = await executeUpdate(`
      INSERT INTO courses (course_code, course_name, course_type, credits, total_hours, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.course_code,
      data.course_name,
      data.course_type || null,
      data.credits || null,
      data.total_hours || null,
      data.status !== undefined ? data.status : 1,
    ])

    const courseId = result.insertId
    const course = await executeOne('SELECT * FROM courses WHERE course_id = ?', [courseId])

    res.json({
      success: true,
      data: course,
      message: 'Course created successfully',
    })
  } catch (error) {
    console.error('Error creating course:', error)
    res.status(500).json({
      success: false,
      error: error.code === 'ER_DUP_ENTRY' ? '课程代码已存在' : 'Failed to create course',
    })
  }
}

export async function updateCourse(req, res) {
  try {
    const { id } = req.params
    const data = req.body

    await executeUpdate(`
      UPDATE courses
      SET course_code = ?, course_name = ?, course_type = ?, credits = ?, total_hours = ?, status = ?
      WHERE course_id = ?
    `, [
      data.course_code,
      data.course_name,
      data.course_type,
      data.credits,
      data.total_hours,
      data.status,
      id,
    ])

    const course = await executeOne('SELECT * FROM courses WHERE course_id = ?', [id])

    res.json({
      success: true,
      data: course,
      message: 'Course updated successfully',
    })
  } catch (error) {
    console.error('Error updating course:', error)
    res.status(500).json({
      success: false,
      error: error.code === 'ER_DUP_ENTRY' ? '课程代码已存在' : 'Failed to update course',
    })
  }
}

export async function deleteCourse(req, res) {
  try {
    const { id } = req.params
    await executeUpdate('DELETE FROM courses WHERE course_id = ?', [id])

    res.json({
      success: true,
      message: 'Course deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting course:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete course',
    })
  }
}
