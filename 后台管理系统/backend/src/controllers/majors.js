import { executeQuery } from '../utils/db.js'

export async function getMajors() {
  try {
    const query = `
      SELECT
        m.major_id,
        m.major_name,
        m.college_id,
        c.college_name
      FROM majors m
      LEFT JOIN colleges c ON m.college_id = c.college_id
      ORDER BY m.major_id
    `
    const majors = await executeQuery(query)

    return {
      success: true,
      data: majors,
      total: majors.length
    }
  } catch (error) {
    console.error('获取专业列表失败:', error)
    return {
      success: false,
      error: error.message || '获取专业列表失败',
      data: [],
      total: 0
    }
  }
}

export async function getMajorById(id) {
  try {
    const query = `
      SELECT
        m.major_id,
        m.major_name,
        m.college_id,
        c.college_name
      FROM majors m
      LEFT JOIN colleges c ON m.college_id = c.college_id
      WHERE m.major_id = ?
    `
    const majors = await executeQuery(query, [id])

    if (majors.length === 0) {
      return {
        success: false,
        error: '专业不存在',
        data: null
      }
    }

    return {
      success: true,
      data: majors[0]
    }
  } catch (error) {
    console.error('获取专业详情失败:', error)
    return {
      success: false,
      error: error.message || '获取专业详情失败',
      data: null
    }
  }
}

export async function createMajor(data) {
  try {
    const query = 'INSERT INTO majors (major_name, college_id) VALUES (?, ?)'
    await executeQuery(query, [data.major_name, data.college_id])

    return {
      success: true,
      message: '专业创建成功'
    }
  } catch (error) {
    console.error('创建专业失败:', error)
    return {
      success: false,
      error: error.message || '创建专业失败'
    }
  }
}

export async function updateMajor(id, data) {
  try {
    const query = 'UPDATE majors SET major_name = ?, college_id = ? WHERE major_id = ?'
    await executeQuery(query, [data.major_name, data.college_id, id])

    return {
      success: true,
      message: '专业更新成功'
    }
  } catch (error) {
    console.error('更新专业失败:', error)
    return {
      success: false,
      error: error.message || '更新专业失败'
    }
  }
}

export async function deleteMajor(id) {
  try {
    const query = 'DELETE FROM majors WHERE major_id = ?'
    await executeQuery(query, [id])

    return {
      success: true,
      message: '专业删除成功'
    }
  } catch (error) {
    console.error('删除专业失败:', error)
    return {
      success: false,
      error: error.message || '删除专业失败'
    }
  }
}
