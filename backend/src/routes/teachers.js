/**
 * 教师路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');

/**
 * 获取教师个人信息
 * GET /api/teachers/profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'teacher') {
      return error(res, '只有教师才能访问此接口', 403);
    }

    const teacher = await query(`
      SELECT t.*, c.college_name
      FROM teachers t
      LEFT JOIN colleges c ON t.college_id = c.college_id
      WHERE t.teacher_id = ?
    `, [userId]);

    if (teacher.length === 0) {
      return error(res, '教师信息不存在', 404);
    }

    delete teacher[0].password;

    success(res, teacher[0], '获取个人信息成功');

  } catch (err) {
    console.error('获取个人信息错误:', err);
    error(res, '获取个人信息失败', 500);
  }
});

/**
 * 获取教师的授课课程
 * GET /api/teachers/courses
 */
router.get('/courses', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'teacher') {
      return error(res, '只有教师才能访问此接口', 403);
    }

    const { semester } = req.query;

    let sql = `
      SELECT
        co.offering_id,
        c.course_name,
        c.course_code,
        c.credits,
        c.course_type,
        co.class_id,
        cl.class_name,
        co.semester,
        co.schedule,
        co.classroom,
        co.status
      FROM course_offerings co
      LEFT JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN classes cl ON co.class_id = cl.class_id
      WHERE co.teacher_id = ?
    `;
    const params = [userId];

    if (semester) {
      sql += ' AND co.semester = ?';
      params.push(semester);
    }

    sql += ' ORDER BY co.semester DESC';

    const courses = await query(sql, params);

    success(res, courses, '获取授课课程成功');

  } catch (err) {
    console.error('获取授课课程错误:', err);
    error(res, '获取授课课程失败', 500);
  }
});

/**
 * 获取班级学生列表
 * GET /api/teachers/class-students
 */
router.get('/class-students', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'teacher') {
      return error(res, '只有教师才能访问此接口', 403);
    }

    const { classId } = req.query;

    if (!classId) {
      return error(res, '班级ID不能为空', 400);
    }

    const students = await query(`
      SELECT
        s.student_id,
        s.student_code,
        s.name,
        s.gender,
        s.phone,
        s.email,
        s.dormitory,
        s.status
      FROM students s
      WHERE s.class_id = ? AND s.status = '在读'
      ORDER BY s.student_code
    `, [classId]);

    success(res, students, '获取班级学生列表成功');

  } catch (err) {
    console.error('获取班级学生列表错误:', err);
    error(res, '获取班级学生列表失败', 500);
  }
});

module.exports = router;
