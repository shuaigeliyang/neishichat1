/**
 * 学生路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error, paginate } = require('../utils/response');
const { query } = require('../config/database');

/**
 * 获取学生个人信息
 * GET /api/students/profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'student') {
      return error(res, '只有学生才能访问此接口', 403);
    }

    const student = await query(`
      SELECT
        s.*,
        c.class_name,
        c.class_id,
        m.major_name,
        m.major_id,
        m.duration,
        col.college_name,
        col.college_id
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
      WHERE s.student_id = ?
    `, [userId]);

    if (student.length === 0) {
      return error(res, '学生信息不存在', 404);
    }

    delete student[0].password;

    success(res, student[0], '获取个人信息成功');

  } catch (err) {
    console.error('获取个人信息错误:', err);
    error(res, '获取个人信息失败', 500);
  }
});

/**
 * 获取学生成绩
 * GET /api/students/grades
 */
router.get('/grades', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'student') {
      return error(res, '只有学生才能访问此接口', 403);
    }

    const { semester } = req.query;

    let sql = `
      SELECT
        g.*,
        c.course_name,
        c.course_code,
        c.credits,
        co.semester,
        t.name as teacher_name
      FROM grades g
      LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
      LEFT JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
      WHERE g.student_id = ?
    `;
    const params = [userId];

    if (semester) {
      sql += ' AND co.semester = ?';
      params.push(semester);
    }

    sql += ' ORDER BY co.semester DESC';

    const grades = await query(sql, params);

    success(res, grades, '获取成绩成功');

  } catch (err) {
    console.error('获取成绩错误:', err);
    error(res, '获取成绩失败', 500);
  }
});

/**
 * 获取学生课程表
 * GET /api/students/timetable
 */
router.get('/timetable', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'student') {
      return error(res, '只有学生才能访问此接口', 403);
    }

    const { semester } = req.query;

    // 获取学生的班级ID
    const studentInfo = await query('SELECT class_id FROM students WHERE student_id = ?', [userId]);

    if (studentInfo.length === 0) {
      return error(res, '学生信息不存在', 404);
    }

    let sql = `
      SELECT
        co.offering_id,
        c.course_name,
        c.course_code,
        c.credits,
        c.course_type,
        t.name as teacher_name,
        co.semester,
        co.schedule,
        co.classroom
      FROM course_offerings co
      LEFT JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
      WHERE co.class_id = ? AND co.status = 1
    `;
    const params = [studentInfo[0].class_id];

    if (semester) {
      sql += ' AND co.semester = ?';
      params.push(semester);
    }

    sql += ' ORDER BY co.semester DESC';

    const courses = await query(sql, params);

    success(res, courses, '获取课程表成功');

  } catch (err) {
    console.error('获取课程表错误:', err);
    error(res, '获取课程表失败', 500);
  }
});

module.exports = router;
