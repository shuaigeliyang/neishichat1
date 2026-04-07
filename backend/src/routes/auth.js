/**
 * 认证路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查询学生
    let user = await query(
      'SELECT student_id as id, student_code as code, name, password, class_id, "student" as user_type FROM students WHERE student_code = ?',
      [username]
    );

    // 查询教师
    if (user.length === 0) {
      user = await query(
        'SELECT teacher_id as id, teacher_code as code, name, password, college_id, "teacher" as user_type FROM teachers WHERE teacher_code = ?',
        [username]
      );
    }

    // 查询管理员（从数据库读取）
    if (user.length === 0) {
      user = await query(
        'SELECT admin_id as id, username as code, name, password, "admin" as user_type FROM admins WHERE username = ? AND status = 1',
        [username]
      );
    }

    if (user.length === 0) {
      return error(res, '用户名或密码错误', 401);
    }

    const userData = user[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, userData.password);

    if (!isPasswordValid) {
      return error(res, '用户名或密码错误', 401);
    }

    // 生成JWT
    const token = jwt.sign(
      {
        id: userData.id,
        type: userData.user_type,
        role: userData.user_type === 'student' ? '学生' : userData.user_type === 'teacher' ? '教师' : '管理员' // 统一为"管理员"，不使用"超级管理员"
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 获取用户详细信息
    let userInfo = {};
    if (userData.user_type === 'student') {
      const studentInfo = await query(`
        SELECT s.*, c.class_name, m.major_name, col.college_name
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.class_id
        LEFT JOIN majors m ON c.major_id = m.major_id
        LEFT JOIN colleges col ON m.college_id = col.college_id
        WHERE s.student_id = ?
      `, [userData.id]);
      userInfo = studentInfo[0];
    } else if (userData.user_type === 'teacher') {
      const teacherInfo = await query(`
        SELECT t.*, c.college_name
        FROM teachers t
        LEFT JOIN colleges c ON t.college_id = c.college_id
        WHERE t.teacher_id = ?
      `, [userData.id]);
      userInfo = teacherInfo[0];
    } else if (userData.user_type === 'admin') {
      const adminInfo = await query(`
        SELECT admin_id as id, username, name, email, role
        FROM admins
        WHERE admin_id = ?
      `, [userData.id]);
      userInfo = adminInfo[0] || {
        id: userData.id,
        name: '系统管理员',
        username: 'admin'
      };
    }

    // 删除密码字段
    delete userInfo.password;

    success(res, {
      token,
      user: {
        id: userData.id,
        type: userData.user_type,
        ...userInfo
      }
    }, '登录成功');

  } catch (err) {
    console.error('登录错误:', err);
    error(res, '登录失败', 500);
  }
});

/**
 * 修改密码
 * PUT /api/auth/change-password
 */
router.put('/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
      return error(res, '参数不完整', 400);
    }

    // 查询用户
    let user = await query(
      'SELECT student_id as id, password, "student" as user_type FROM students WHERE student_code = ?',
      [username]
    );

    if (user.length === 0) {
      user = await query(
        'SELECT teacher_id as id, password, "teacher" as user_type FROM teachers WHERE teacher_code = ?',
        [username]
      );
    }

    if (user.length === 0) {
      return error(res, '用户不存在', 404);
    }

    const userData = user[0];

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, userData.password);
    if (!isPasswordValid) {
      return error(res, '原密码错误', 401);
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    if (userData.user_type === 'student') {
      await query('UPDATE students SET password = ? WHERE student_id = ?', [hashedPassword, userData.id]);
    } else {
      await query('UPDATE teachers SET password = ? WHERE teacher_id = ?', [hashedPassword, userData.id]);
    }

    success(res, null, '密码修改成功');

  } catch (err) {
    console.error('修改密码错误:', err);
    error(res, '修改密码失败', 500);
  }
});

module.exports = router;
