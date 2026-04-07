/**
 * 全局错误处理中间件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const logger = require('../utils/logger');

/**
 * 错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - next函数
 */
function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error('服务器错误', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // 数据库错误
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      success: false,
      code: 500,
      message: '数据库操作失败',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 401,
      message: '无效的访问令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 401,
      message: '访问令牌已过期'
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      code: 400,
      message: '数据验证失败',
      errors: err.errors
    });
  }

  // 默认错误响应
  res.status(err.status || 500).json({
    success: false,
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

/**
 * 404处理中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 404,
    message: `请求的资源 ${req.url} 不存在`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
