/**
 * 管理办法路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');

/**
 * 获取管理办法列表
 * GET /api/regulations
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, status = '生效中' } = req.query;

    let sql = 'SELECT * FROM regulations WHERE status = ?';
    const params = [status];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY effective_date DESC';

    const regulations = await query(sql, params);

    success(res, regulations, '获取管理办法列表成功');

  } catch (err) {
    console.error('获取管理办法列表错误:', err);
    error(res, '获取管理办法列表失败', 500);
  }
});

/**
 * 获取管理办法详情
 * GET /api/regulations/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const regulation = await query('SELECT * FROM regulations WHERE regulation_id = ?', [id]);

    if (regulation.length === 0) {
      return error(res, '管理办法不存在', 404);
    }

    // 增加浏览次数
    await query('UPDATE regulations SET view_count = view_count + 1 WHERE regulation_id = ?', [id]);

    success(res, regulation[0], '获取管理办法详情成功');

  } catch (err) {
    console.error('获取管理办法详情错误:', err);
    error(res, '获取管理办法详情失败', 500);
  }
});

/**
 * 搜索管理办法
 * GET /api/regulations/search/:keyword
 */
router.get('/search/:keyword', authenticate, async (req, res) => {
  try {
    const { keyword } = req.params;

    const regulations = await query(`
      SELECT * FROM regulations
      WHERE status = '生效中'
      AND (title LIKE ? OR content LIKE ? OR category LIKE ?)
      ORDER BY effective_date DESC
      LIMIT 20
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

    success(res, regulations, '搜索管理办法成功');

  } catch (err) {
    console.error('搜索管理办法错误:', err);
    error(res, '搜索管理办法失败', 500);
  }
});

module.exports = router;
