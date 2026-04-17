import { executeQuery } from '../utils/db.js'

export async function getColleges() {
  try {
    const query = 'SELECT college_id, college_name FROM colleges ORDER BY college_id'
    const colleges = await executeQuery(query)

    return {
      success: true,
      data: colleges,
      total: colleges.length
    }
  } catch (error) {
    console.error('获取学院列表失败:', error)
    return {
      success: false,
      error: error.message || '获取学院列表失败',
      data: [],
      total: 0
    }
  }
}

export async function getCollegeById(id) {
  try {
    const query = 'SELECT * FROM colleges WHERE college_id = ?'
    const colleges = await executeQuery(query, [id])

    if (colleges.length === 0) {
      return {
        success: false,
        error: '学院不存在',
        data: null
      }
    }

    return {
      success: true,
      data: colleges[0]
    }
  } catch (error) {
    console.error('获取学院详情失败:', error)
    return {
      success: false,
      error: error.message || '获取学院详情失败',
      data: null
    }
  }
}

export async function createCollege(data) {
  try {
    const query = 'INSERT INTO colleges (college_name) VALUES (?)'
    await executeQuery(query, [data.college_name])

    return {
      success: true,
      message: '学院创建成功'
    }
  } catch (error) {
    console.error('创建学院失败:', error)
    return {
      success: false,
      error: error.message || '创建学院失败'
    }
  }
}

export async function updateCollege(id, data) {
  try {
    const query = 'UPDATE colleges SET college_name = ? WHERE college_id = ?'
    await executeQuery(query, [data.college_name, id])

    return {
      success: true,
      message: '学院更新成功'
    }
  } catch (error) {
    console.error('更新学院失败:', error)
    return {
      success: false,
      error: error.message || '更新学院失败'
    }
  }
}

export async function deleteCollege(id) {
  try {
    const query = 'DELETE FROM colleges WHERE college_id = ?'
    await executeQuery(query, [id])

    return {
      success: true,
      message: '学院删除成功'
    }
  } catch (error) {
    console.error('删除学院失败:', error)
    return {
      success: false,
      error: error.message || '删除学院失败'
    }
  }
}
