/**
 * 数据库配置和连接池管理
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// 数据库连接池配置
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'education_system',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: '+08:00'
};

// 创建连接池
const pool = mysql.createPool(poolConfig);

// 测试数据库连接
pool.getConnection()
  .then(connection => {
    logger.info('数据库连接成功！', { host: poolConfig.host, database: poolConfig.database });
    connection.release();
  })
  .catch(error => {
    logger.error('数据库连接失败！', { error: error.message });
    process.exit(1);
  });

/**
 * 执行查询
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Object>}
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('数据库查询错误', { sql, params, error: error.message });
    throw error;
  }
}

/**
 * 执行事务
 * @param {Function} callback - 事务回调函数
 * @returns {Promise<Object>}
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('事务执行失败', { error: error.message });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取连接池状态
 * @returns {Object}
 */
function getPoolStatus() {
  return {
    totalConnections: pool.pool._allConnections.length,
    freeConnections: pool.pool._freeConnections.length,
    queueLength: pool.pool._connectionQueue.length
  };
}

module.exports = {
  pool,
  query,
  transaction,
  getPoolStatus
};
