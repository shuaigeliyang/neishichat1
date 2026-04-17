import { executeQuery } from '../utils/db.js'

export async function getStats(req, res) {
  try {
    // 获取学生总数
    const studentResult = await executeQuery('SELECT COUNT(*) as count FROM students')
    const totalStudents = studentResult[0]?.count || 0

    // 获取教师总数
    const teacherResult = await executeQuery('SELECT COUNT(*) as count FROM teachers')
    const totalTeachers = teacherResult[0]?.count || 0

    // 获取课程总数
    const courseResult = await executeQuery('SELECT COUNT(*) as count FROM courses')
    const totalCourses = courseResult[0]?.count || 0

    // 获取班级总数
    const classResult = await executeQuery('SELECT COUNT(*) as count FROM classes')
    const totalClasses = classResult[0]?.count || 0

    // 获取知识库文件数量（从主系统获取）
    const knowledgeFiles = 0 // TODO: 从主系统API获取

    // 获取文档块总数
    const totalChunks = 0 // TODO: 从主系统API获取

    const stats = {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalClasses,
      knowledgeFiles,
      totalChunks,
    }

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    })
  }
}
