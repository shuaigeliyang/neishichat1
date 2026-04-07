/**
 * SQL安全验证中间件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：验证SQL语句的安全性，防止SQL注入和恶意查询
 */

const logger = require('../utils/logger');

/**
 * 危险SQL关键词黑名单
 */
const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
  'CREATE', 'TRUNCATE', 'EXECUTE', 'EXEC', 'SCRIPT',
  'JAVASCRIPT', 'DECLARE', 'CURSOR', 'PROCEDURE',
  'FUNCTION', 'TRIGGER', 'VIEW', 'GRANT', 'REVOKE'
];

/**
 * 危险SQL模式（正则表达式）
 */
const DANGEROUS_PATTERNS = [
  /--/,                    // SQL注释
  /\/\*/,                  // 多行注释开始
  /\*\//,                  // 多行注释结束
  /;/,                     // 多语句分隔符
  /\bUNION\b.*\bSELECT\b/i,  // UNION注入
  /\bOR\b\s+\d+\s*=\s*\d+/i,  // OR注入（如：OR 1=1）
  /\bAND\b\s+\d+\s*=\s*\d+/i, // AND注入（如：AND 1=1）
  /\bor\b\s+'[^']+'\s*=\s*'[^']+'/i,  // OR字符串注入（如：OR 'a'='a'）
  /\band\b\s+'[^']+'\s*=\s*'[^']+'/i, // AND字符串注入（如：AND 'a'='a'）
  /\bxp_\w+/i,             // SQL Server扩展存储过程
  /\bsleep\(/i,            // MySQL延时函数
  /\bwaitfor\s+delay\b/i,  // SQL Server延时
  /\bbenchmark\(/i         // MySQL基准测试函数
];

/**
 * 验证SQL是否安全
 * @param {string} sql - 待验证的SQL
 * @returns {Object} {safe: boolean, error: string, warnings: Array}
 */
function validateSQL(sql) {
  const warnings = [];

  // 基础检查
  if (!sql || typeof sql !== 'string') {
    return {
      safe: false,
      error: 'SQL不能为空',
      warnings: []
    };
  }

  // 去除首尾空格
  const trimmedSQL = sql.trim();

  // 转换为大写进行检测
  const upperSQL = trimmedSQL.toUpperCase();

  // 检查1：必须是SELECT语句
  if (!upperSQL.startsWith('SELECT')) {
    return {
      safe: false,
      error: '只允许SELECT查询语句',
      warnings: []
    };
  }

  // 检查2：危险关键词检测
  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(trimmedSQL)) {
      return {
        safe: false,
        error: `SQL包含危险关键词: ${keyword}`,
        warnings: []
      };
    }
  }

  // 检查3：危险模式检测
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedSQL)) {
      return {
        safe: false,
        error: 'SQL包含危险模式或注入攻击特征',
        warnings: []
      };
    }
  }

  // 检查4：多语句检测
  const statements = trimmedSQL.split(';').filter(s => s.trim().length > 0);
  if (statements.length > 1) {
    return {
      safe: false,
      error: '只允许单条SQL语句',
      warnings: []
    };
  }

  // 检查5：建议性检查（不阻止执行，但发出警告）
  if (!upperSQL.includes('LIMIT') && !upperSQL.includes('WHERE')) {
    warnings.push('建议添加LIMIT或WHERE条件以限制返回行数');
  }

  if (upperSQL.includes('SELECT *')) {
    warnings.push('建议指定具体列名而不是使用SELECT *');
  }

  logger.info('SQL验证通过', {
    sqlLength: sql.length,
    warnings: warnings.length
  });

  return {
    safe: true,
    warnings: warnings
  };
}

/**
 * 中间件函数：验证请求体中的SQL
 */
function sqlValidatorMiddleware(req, res, next) {
  try {
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({
        success: false,
        message: '缺少SQL参数'
      });
    }

    const validation = validateSQL(sql);

    if (!validation.safe) {
      logger.warn('SQL验证失败', {
        sql: sql.substring(0, 100),
        error: validation.error
      });

      return res.status(403).json({
        success: false,
        message: 'SQL安全验证失败',
        error: validation.error
      });
    }

    // 如果有警告，记录到日志
    if (validation.warnings.length > 0) {
      logger.info('SQL验证警告', {
        sql: sql.substring(0, 100),
        warnings: validation.warnings
      });
    }

    // 将验证结果附加到请求对象
    req.sqlValidation = validation;
    next();

  } catch (error) {
    logger.error('SQL验证中间件错误', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'SQL验证失败'
    });
  }
}

module.exports = {
  validateSQL,
  sqlValidatorMiddleware
};
