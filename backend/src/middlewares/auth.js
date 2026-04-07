/**
 * 认证中间件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * JWT认证中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - next函数
 */
function authenticate(req, res, next) {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, '未提供访问令牌', 401);
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.id,
      type: decoded.type, // 'student', 'teacher', 'admin'
      role: decoded.role
    };

    logger.info('用户认证成功', { userId: req.user.id, userType: req.user.type });

    next();
  } catch (err) {
    logger.error('认证失败', { error: err.message });
    return error(res, '访问令牌无效或已过期', 401);
  }
}

/**
 * 角色权限验证中间件
 * @param {Array<string>} allowedRoles - 允许的角色列表
 * @returns {Function}
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, '未认证的用户', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, '权限不足', 403);
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize
};
