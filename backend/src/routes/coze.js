/**
 * Coze平台专用API接口
 * 允许Coze Bot查询本地数据库数据
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');

// Coze API密钥验证
const COZE_API_KEY = process.env.COZE_API_KEY || 'coze-api-key-2026-hailei-chan';

/**
 * 验证API密钥中间件
 */
function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Coze API调用缺少密钥', { ip: req.ip });
    return res.status(401).json({
      success: false,
      message: '缺少API密钥'
    });
  }

  if (apiKey !== COZE_API_KEY) {
    logger.warn('Coze API调用密钥无效', { ip: req.ip, apiKey: apiKey.substring(0, 10) + '...' });
    return res.status(403).json({
      success: false,
      message: '无效的API密钥'
    });
  }

  next();
}

// 应用验证中间件到所有路由
router.use(verifyApiKey);

/**
 * 健康检查接口（用于测试连接）
 * GET /api/coze/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Coze API运行正常',
    timestamp: new Date().toISOString()
  });
});

/**
 * 查询学生基本信息
 * POST /api/coze/student-info
 *
 * Body:
 * - student_id: 学号（必填）
 */
router.post('/student-info', async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: '学号不能为空'
      });
    }

    logger.info('Coze查询学生信息', { student_id });

    const query = `
      SELECT
        s.student_id,
        s.name,
        s.gender,
        s.birth_date,
        s.enrollment_date,
        s.phone,
        s.email,
        s.address,
        s.status,
        c.class_name,
        m.major_name,
        college.college_name,
        CONCAT(c.grade, '级') as grade
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges college ON m.college_id = college.college_id
      WHERE s.student_id = ?
    `;

    const [results] = await db.query(query, [student_id]);

    if (results.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: `未找到学号为 ${student_id} 的学生信息`
      });
    }

    const student = results[0];

    // 格式化返回数据，让Coze更容易理解
    const formattedResult = {
      found: true,
      student_id: student.student_id,
      name: student.name,
      gender: student.gender === 'M' ? '男' : '女',
      birth_date: student.birth_date,
      enrollment_date: student.enrollment_date,
      grade: student.grade,
      class_name: student.class_name,
      major_name: student.major_name,
      college_name: student.college_name,
      phone: student.phone || '未填写',
      email: student.email || '未填写',
      address: student.address || '未填写',
      status: student.status === 'active' ? '在读' : '其他状态'
    };

    logger.info('查询学生信息成功', { student_id, name: student.name });
    res.json({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    logger.error('查询学生信息失败', { error: error.message });
    res.status(500).json({
      success: false,
      error: '查询失败：' + error.message
    });
  }
});

/**
 * 查询学生成绩
 * POST /api/coze/student-grades
 *
 * Body:
 * - student_id: 学号（必填）
 * - semester: 学期（可选，格式：2023-2024-1）
 */
router.post('/student-grades', async (req, res) => {
  try {
    const { student_id, semester } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: '学号不能为空'
      });
    }

    logger.info('Coze查询学生成绩', { student_id, semester });

    let query = `
      SELECT
        c.course_name,
        c.course_code,
        c.course_type,
        g.score,
        g.credit,
        g.grade_point,
        g.semester,
        g.academic_year,
        CONCAT(g.academic_year, '-', g.semester) as full_semester,
        t.name as teacher_name
      FROM grades g
      LEFT JOIN courses c ON g.course_id = c.id
      LEFT JOIN course_offerings co ON g.offering_id = co.id
      LEFT JOIN teachers t ON co.teacher_id = t.id
      WHERE g.student_id = ?
    `;

    const params = [student_id];

    if (semester) {
      query += ` AND CONCAT(g.academic_year, '-', g.semester) = ?`;
      params.push(semester);
    }

    query += ` ORDER BY g.academic_year DESC, g.semester DESC, c.course_name`;

    const [results] = await db.query(query, params);

    if (results.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: semester
          ? `未找到 ${student_id} 在 ${semester} 学期的成绩`
          : `未找到学号为 ${student_id} 的成绩记录`
      });
    }

    // 按学期分组
    const groupedBySemester = {};
    results.forEach(grade => {
      const sem = grade.full_semester;
      if (!groupedBySemester[sem]) {
        groupedBySemester[sem] = [];
      }
      groupedBySemester[sem].push({
        course_name: grade.course_name,
        course_code: grade.course_code,
        course_type: grade.course_type,
        score: grade.score,
        credit: grade.credit,
        grade_point: grade.grade_point,
        teacher_name: grade.teacher_name
      });
    });

    // 计算统计信息
    const allScores = results.filter(r => r.score !== null).map(r => r.score);
    const avgScore = allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
      : 0;

    const formattedResult = {
      found: true,
      student_id: student_id,
      total_courses: results.length,
      average_score: parseFloat(avgScore),
      semesters: groupedBySemester
    };

    logger.info('查询成绩成功', { student_id, count: results.length });
    res.json({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    logger.error('查询成绩失败', { error: error.message });
    res.status(500).json({
      success: false,
      error: '查询失败：' + error.message
    });
  }
});

/**
 * 查询学生课程表
 * POST /api/coze/student-timetable
 *
 * Body:
 * - student_id: 学号（必填）
 * - academic_year: 学年（可选，格式：2023-2024）
 * - semester: 学期（可选，1或2）
 */
router.post('/student-timetable', async (req, res) => {
  try {
    const { student_id, academic_year, semester } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: '学号不能为空'
      });
    }

    logger.info('Coze查询课程表', { student_id, academic_year, semester });

    let query = `
      SELECT DISTINCT
        c.course_name,
        c.course_code,
        c.course_type,
        c.credit,
        co.day_of_week,
        co.start_time,
        co.end_time,
        co.classroom,
        co.weeks,
        t.name as teacher_name,
        CONCAT(co.academic_year, '-', co.semester) as full_semester
      FROM course_offerings co
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN teachers t ON co.teacher_id = t.id
      LEFT JOIN class_students cs ON co.class_id = cs.class_id
      WHERE cs.student_id = ?
    `;

    const params = [student_id];

    if (academic_year) {
      query += ` AND co.academic_year = ?`;
      params.push(academic_year);
    }

    if (semester) {
      query += ` AND co.semester = ?`;
      params.push(semester);
    }

    query += ` ORDER BY co.day_of_week, co.start_time`;

    const [results] = await db.query(query, params);

    if (results.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: '未找到课程表信息'
      });
    }

    // 按星期分组
    const weekDays = {
      1: '周一',
      2: '周二',
      3: '周三',
      4: '周四',
      5: '周五',
      6: '周六',
      7: '周日'
    };

    const groupedByDay = {};
    results.forEach(course => {
      const day = weekDays[course.day_of_week] || `周${course.day_of_week}`;
      if (!groupedByDay[day]) {
        groupedByDay[day] = [];
      }
      groupedByDay[day].push({
        course_name: course.course_name,
        course_type: course.course_type,
        teacher_name: course.teacher_name,
        classroom: course.classroom,
        time: `${course.start_time}-${course.end_time}`,
        weeks: course.weeks,
        credit: course.credit
      });
    });

    const formattedResult = {
      found: true,
      student_id: student_id,
      total_courses: results.length,
      timetable: groupedByDay
    };

    logger.info('查询课程表成功', { student_id, count: results.length });
    res.json({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    logger.error('查询课程表失败', { error: error.message });
    res.status(500).json({
      success: false,
      error: '查询失败：' + error.message
    });
  }
});

/**
 * 综合查询（一次性查询学生所有信息）
 * POST /api/coze/student-all
 *
 * Body:
 * - student_id: 学号（必填）
 */
router.post('/student-all', async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: '学号不能为空'
      });
    }

    logger.info('Coze综合查询学生信息', { student_id });

    // 并行查询所有信息
    const [infoResult] = await Promise.all([
      // 查询基本信息
      db.query(`
        SELECT s.*, c.class_name, m.major_name, college.college_name
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.class_id
        LEFT JOIN majors m ON c.major_id = m.major_id
        LEFT JOIN colleges college ON m.college_id = college.college_id
        WHERE s.student_id = ?
      `, [student_id])
    ]);

    if (infoResult.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: `未找到学号为 ${student_id} 的学生信息`
      });
    }

    const student = infoResult[0];

    // 查询成绩
    const [gradesResult] = await db.query(`
      SELECT c.course_name, g.score, g.credit, CONCAT(g.academic_year, '-', g.semester) as semester
      FROM grades g
      LEFT JOIN courses c ON g.course_id = c.id
      WHERE g.student_id = ?
      ORDER BY g.academic_year DESC, g.semester DESC
      LIMIT 10
    `, [student_id]);

    // 查询当前学期课程
    const [coursesResult] = await db.query(`
      SELECT c.course_name, t.name as teacher_name,
             co.day_of_week, co.start_time, co.end_time, co.classroom
      FROM course_offerings co
      LEFT JOIN courses c ON co.course_id = c.id
      LEFT JOIN teachers t ON co.teacher_id = t.id
      LEFT JOIN class_students cs ON co.class_id = cs.class_id
      WHERE cs.student_id = ?
      AND co.academic_year = YEAR(CURDATE())
      ORDER BY co.day_of_week, co.start_time
    `, [student_id]);

    const formattedResult = {
      found: true,
      student_id: student.student_id,
      name: student.name,
      gender: student.gender === 'M' ? '男' : '女',
      class_name: student.class_name,
      major_name: student.major_name,
      college_name: student.college_name,
      phone: student.phone || '未填写',
      email: student.email || '未填写',
      recent_grades: gradesResult.map(g => ({
        course_name: g.course_name,
        score: g.score,
        credit: g.credit,
        semester: g.semester
      })),
      current_courses: coursesResult.map(c => ({
        course_name: c.course_name,
        teacher_name: c.teacher_name,
        time: `${c.start_time}-${c.end_time}`,
        classroom: c.classroom
      }))
    };

    logger.info('综合查询成功', { student_id, name: student.name });
    res.json({
      success: true,
      data: formattedResult
    });

  } catch (error) {
    logger.error('综合查询失败', { error: error.message });
    res.status(500).json({
      success: false,
      error: '查询失败：' + error.message
    });
  }
});

/**
 * 验证学号格式
 * POST /api/coze/validate-student-id
 *
 * Body:
 * - student_id: 学号
 */
router.post('/validate-student-id', async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.json({
        success: true,
        valid: false,
        message: '学号不能为空'
      });
    }

    // 内江师范学院学号格式：S + 年份(4位) + 学院编号(2位) + 班级编号(2位) + 序号(3位)
    const pattern = /^S\d{9}$/;

    if (!pattern.test(student_id)) {
      return res.json({
        success: true,
        valid: false,
        message: '学号格式不正确，正确格式为：S开头 + 9位数字'
      });
    }

    // 检查学号是否存在于数据库
    const [results] = await db.query(
      'SELECT name FROM students WHERE student_id = ?',
      [student_id]
    );

    if (results.length === 0) {
      return res.json({
        success: true,
        valid: false,
        exists_in_db: false,
        message: `学号 ${student_id} 格式正确，但系统中不存在此学号`
      });
    }

    res.json({
      success: true,
      valid: true,
      exists_in_db: true,
      student_name: results[0].name,
      message: `学号 ${student_id} 验证通过`
    });

  } catch (error) {
    logger.error('验证学号失败', { error: error.message });
    res.status(500).json({
      success: false,
      error: '验证失败：' + error.message
    });
  }
});

module.exports = router;
