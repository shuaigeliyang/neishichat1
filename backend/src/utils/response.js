/**
 * 统一响应格式工具
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 返回数据
 * @param {string} message - 响应消息
 * @param {number} code - HTTP状态码
 */
function success(res, data = null, message = '操作成功', code = 200) {
  res.status(code).json({
    success: true,
    code,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} code - HTTP状态码
 * @param {*} errors - 详细错误信息
 */
function error(res, message = '操作失败', code = 500, errors = null) {
  res.status(code).json({
    success: false,
    code,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
}

/**
 * 分页响应
 * @param {Object} res - Express响应对象
 * @param {Array} list - 数据列表
 * @param {Object} pagination - 分页信息
 * @param {string} message - 响应消息
 */
function paginate(res, list, pagination, message = '查询成功') {
  res.status(200).json({
    success: true,
    code: 200,
    message,
    data: list,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.pageSize)
    },
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  success,
  error,
  paginate
};
