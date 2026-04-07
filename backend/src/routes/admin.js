/**
 * 管理员路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query, transaction } = require('../config/database');

/**
 * 获取系统统计信息
 * GET /api/admin/statistics
 */
router.get('/statistics', authenticate, authorize('管理员'), async (req, res) => {
  try {
    const stats = {};

    stats.colleges = (await query('SELECT COUNT(*) as count FROM colleges'))[0].count;
    stats.majors = (await query('SELECT COUNT(*) as count FROM majors'))[0].count;
    stats.classes = (await query('SELECT COUNT(*) as count FROM classes'))[0].count;
    stats.students = (await query('SELECT COUNT(*) as count FROM students WHERE status = "在读"'))[0].count;
    stats.teachers = (await query('SELECT COUNT(*) as count FROM teachers WHERE status = 1'))[0].count;
    stats.courses = (await query('SELECT COUNT(*) as count FROM courses WHERE status = 1'))[0].count;
    stats.regulations = (await query('SELECT COUNT(*) as count FROM regulations WHERE status = "生效中"'))[0].count;

    success(res, stats, '获取统计信息成功');

  } catch (err) {
    console.error('获取统计信息错误:', err);
    error(res, '获取统计信息失败', 500);
  }
});

/**
 * 添加管理办法
 * POST /api/admin/regulations
 */
router.post('/regulations', authenticate, authorize('管理员'), async (req, res) => {
  try {
    const { title, category, content, version, effective_date, publisher } = req.body;

    if (!title || !category || !content || !version) {
      return error(res, '必填字段不能为空', 400);
    }

    const result = await query(`
      INSERT INTO regulations (title, category, content, version, effective_date, publisher, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, '生效中', ?)
    `, [title, category, content, version, effective_date, publisher, req.user.id]);

    success(res, { regulationId: result.insertId }, '添加管理办法成功');

  } catch (err) {
    console.error('添加管理办法错误:', err);
    error(res, '添加管理办法失败', 500);
  }
});

/**
 * 更新管理办法（创建新版本）
 * PUT /api/admin/regulations/:id
 */
router.put('/regulations/:id', authenticate, authorize('管理员'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, content, version, effective_date, publisher } = req.body;

    if (!title || !category || !content || !version) {
      return error(res, '必填字段不能为空', 400);
    }

    // 先将旧版本标记为已失效
    await query('UPDATE regulations SET status = "已失效", expiry_date = CURDATE() WHERE regulation_id = ?', [id]);

    // 创建新版本
    const result = await query(`
      INSERT INTO regulations (title, category, content, version, effective_date, publisher, status, parent_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, '生效中', ?, ?)
    `, [title, category, content, version, effective_date, publisher, id, req.user.id]);

    success(res, { regulationId: result.insertId }, '更新管理办法成功');

  } catch (err) {
    console.error('更新管理办法错误:', err);
    error(res, '更新管理办法失败', 500);
  }
});

/**
 * 添加可下载表格
 * POST /api/admin/forms
 */
router.post('/forms', authenticate, authorize('管理员'), async (req, res) => {
  try {
    const { form_name, category, description, file_url, file_type, file_size, target_user } = req.body;

    if (!form_name || !category || !file_url || !target_user) {
      return error(res, '必填字段不能为空', 400);
    }

    const result = await query(`
      INSERT INTO downloadable_forms (form_name, category, description, file_url, file_type, file_size, target_user, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [form_name, category, description, file_url, file_type, file_size, target_user, req.user.id]);

    success(res, { formId: result.insertId }, '添加表格成功');

  } catch (err) {
    console.error('添加表格错误:', err);
    error(res, '添加表格失败', 500);
  }
});

/**
 * 删除表格
 * DELETE /api/admin/forms/:id
 */
router.delete('/forms/:id', authenticate, authorize('管理员'), async (req, res) => {
  try {
    const { id } = req.params;

    await query('UPDATE downloadable_forms SET status = 0 WHERE form_id = ?', [id]);

    success(res, null, '删除表格成功');

  } catch (err) {
    console.error('删除表格错误:', err);
    error(res, '删除表格失败', 500);
  }
});

/**
 * 获取对话历史
 * GET /api/admin/chat-history
 */
router.get('/chat-history', authenticate, authorize('管理员'), async (req, res) => {
  try {
    const { limit = 50, user_type, user_id } = req.query;
    const limitValue = Math.min(parseInt(limit) || 50, 100); // 限制最大100条

    console.log('📋 管理员获取历史记录:', { limitValue, user_type, user_id });

    let sql = 'SELECT * FROM chat_history WHERE 1=1';
    const params = [];

    if (user_type) {
      sql += ' AND user_type = ?';
      params.push(user_type);
    }

    if (user_id) {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }

    // LIMIT不能使用参数化查询，需要字符串拼接（已经验证了最大值）
    sql += ` ORDER BY created_at DESC LIMIT ${limitValue}`;

    const history = await query(sql, params);

    console.log('✅ 查询成功，返回', history.length, '条记录');

    success(res, history, '获取对话历史成功');

  } catch (err) {
    console.error('❌ 获取对话历史错误:', err);
    console.error('错误详情:', {
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    error(res, '获取对话历史失败', 500);
  }
});

/**
 * 添加学生
 * POST /api/admin/students
 */
router.post('/students', authenticate, authorize('管理员'), async (req, res) => {
  try {
    const {
      student_code, name, gender, birth_date, id_card,
      class_id, phone, email, address, enrollment_date,
      political_status, nation, dormitory, guardian_name, guardian_phone
    } = req.body;

    if (!student_code || !name || !class_id) {
      return error(res, '学号、姓名和班级不能为空', 400);
    }

    const bcrypt = require('bcryptjs');
    const password = await bcrypt.hash('123456', 10); // 默认密码

    const result = await query(`
      INSERT INTO students (
        student_code, name, gender, birth_date, id_card, class_id,
        phone, email, address, enrollment_date, political_status,
        nation, dormitory, guardian_name, guardian_phone, password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      student_code, name, gender, birth_date, id_card, class_id,
      phone, email, address, enrollment_date, political_status,
      nation, dormitory, guardian_name, guardian_phone, password
    ]);

    success(res, { studentId: result.insertId }, '添加学生成功');

  } catch (err) {
    console.error('添加学生错误:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, '学号已存在', 400);
    }
    error(res, '添加学生失败', 500);
  }
});

module.exports = router;
