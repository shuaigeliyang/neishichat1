/**
 * 课程路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');

/**
 * 获取课程列表
 * GET /api/courses
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, semester } = req.query;

    let sql = 'SELECT * FROM courses WHERE status = 1';
    const params = [];

    if (category) {
      sql += ' AND course_type = ?';
      params.push(category);
    }

    sql += ' ORDER BY course_code';

    const courses = await query(sql, params);

    success(res, courses, '获取课程列表成功');

  } catch (err) {
    console.error('获取课程列表错误:', err);
    error(res, '获取课程列表失败', 500);
  }
});

/**
 * 获取课程详情
 * GET /api/courses/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const course = await query(`
      SELECT c.*, t.name as teacher_name, t.teacher_code
      FROM course_offerings co
      LEFT JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
      WHERE co.offering_id = ?
    `, [id]);

    if (course.length === 0) {
      return error(res, '课程不存在', 404);
    }

    success(res, course[0], '获取课程详情成功');

  } catch (err) {
    console.error('获取课程详情错误:', err);
    error(res, '获取课程详情失败', 500);
  }
});

module.exports = router;
