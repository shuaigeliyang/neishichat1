/**
 * 成绩路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');

/**
 * 获取成绩统计
 * GET /api/grades/statistics
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'student') {
      return error(res, '只有学生才能访问此接口', 403);
    }

    const stats = await query(`
      SELECT
        COUNT(*) as total_courses,
        AVG(total_score) as avg_score,
        SUM(CASE WHEN total_score >= 90 THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN total_score >= 80 AND total_score < 90 THEN 1 ELSE 0 END) as good_count,
        SUM(CASE WHEN total_score >= 60 AND total_score < 80 THEN 1 ELSE 0 END) as pass_count,
        SUM(CASE WHEN total_score < 60 THEN 1 ELSE 0 END) as fail_count,
        SUM(credits) as total_credits
      FROM grades g
      LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
      LEFT JOIN courses c ON co.course_id = c.course_id
      WHERE g.student_id = ?
    `, [userId]);

    success(res, stats[0], '获取成绩统计成功');

  } catch (err) {
    console.error('获取成绩统计错误:', err);
    error(res, '获取成绩统计失败', 500);
  }
});

module.exports = router;
