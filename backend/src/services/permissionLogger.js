/**
 * 权限日志服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：记录所有权限验证和拒绝事件
 */

const { query } = require('../config/database');

class PermissionLogger {
  /**
   * 记录权限验证
   * @param {Object} user - 用户信息
   * @param {string} action - 操作类型
   * @param {string} resource - 资源类型
   * @param {boolean} allowed - 是否允许
   * @param {Object} details - 详细信息
   */
  async logPermission({ user, action, resource, allowed, details }) {
    try {
      const { type: userType, id: userId } = user;

      // 先尝试写入system_logs表
      await query(`
        INSERT INTO system_logs (user_type, user_id, action, module, description, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userType,
        userId,
        action,
        resource,
        details?.message || `${allowed ? '权限验证通过' : '权限验证拒绝'}`,
        allowed ? '成功' : '失败'
      ]);

      console.log('📝 权限日志记录', {
        userType,
        userId,
        action,
        resource,
        allowed,
        timestamp: new Date().toISOString()
      });

      // 如果是权限拒绝，发送警告
      if (!allowed) {
        console.warn('⚠️ 权限拒绝警告', {
          userType,
          userId,
          action,
          resource,
          reason: details?.message,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ 记录权限日志失败', { error: error.message });
    }
  }

  /**
   * 记录查询权限验证
   * @param {Object} user - 用户信息
   * @param {string} intent - 查询意图
   * @param {boolean} allowed - 是否允许
   * @param {string} reason - 原因
   */
  async logQueryPermission(user, intent, allowed, reason) {
    return await this.logPermission({
      user,
      action: 'query',
      resource: intent,
      allowed,
      details: { message: reason }
    });
  }

  /**
   * 记录下载权限验证
   * @param {Object} user - 用户信息
   * @param {string} downloadType - 下载类型
   * @param {boolean} allowed - 是否允许
   * @param {string} reason - 原因
   */
  async logDownloadPermission(user, downloadType, allowed, reason) {
    return await this.logPermission({
      user,
      action: 'download',
      resource: downloadType,
      allowed,
      details: { message: reason }
    });
  }

  /**
   * 记录表单生成
   * @param {Object} user - 用户信息
   * @param {string} formType - 表单类型
   * @param {boolean} success - 是否成功
   */
  async logFormGeneration(user, formType, success) {
    return await this.logPermission({
      user,
      action: 'generate_form',
      resource: formType,
      allowed: success,
      details: { message: success ? '表单生成成功' : '表单生成失败' }
    });
  }

  /**
   * 记录表单下载
   * @param {Object} user - 用户信息
   * @param {string} fileName - 文件名
   */
  async logFormDownload(user, fileName) {
    return await this.logPermission({
      user,
      action: 'download_form',
      resource: fileName,
      allowed: true,
      details: { message: `下载表单: ${fileName}` }
    });
  }

  /**
   * 查询权限拒绝日志
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 日志列表
   */
  async getDeniedLogs(filters = {}) {
    try {
      let sql = `
        SELECT
          log_id,
          user_type,
          user_id,
          action,
          module,
          description,
          created_at
        FROM system_logs
        WHERE status = '失败'
      `;
      const params = [];

      if (filters.userType) {
        sql += ' AND user_type = ?';
        params.push(filters.userType);
      }

      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.action) {
        sql += ' AND action = ?';
        params.push(filters.action);
      }

      if (filters.startDate) {
        sql += ' AND created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += ' AND created_at <= ?';
        params.push(filters.endDate);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ` LIMIT ${filters.limit}`;
      }

      const logs = await query(sql, params);
      return logs;

    } catch (error) {
      console.error('❌ 查询权限日志失败', { error: error.message });
      return [];
    }
  }

  /**
   * 获取权限统计
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 统计信息
   */
  async getPermissionStats(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.endDate);
      }

      // 总请求数
      const totalResult = await query(`
        SELECT COUNT(*) as count FROM system_logs ${whereClause}
      `, params);
      const total = totalResult[0].count;

      // 拒绝数
      const deniedResult = await query(`
        SELECT COUNT(*) as count FROM system_logs ${whereClause} AND status = '失败'
      `, params);
      const denied = deniedResult[0].count;

      // 按用户类型统计
      const byType = await query(`
        SELECT
          user_type,
          COUNT(*) as total,
          SUM(CASE WHEN status = '失败' THEN 1 ELSE 0 END) as denied
        FROM system_logs ${whereClause}
        GROUP BY user_type
      `, params);

      // 按操作类型统计
      const byAction = await query(`
        SELECT
          action,
          COUNT(*) as total,
          SUM(CASE WHEN status = '失败' THEN 1 ELSE 0 END) as denied
        FROM system_logs ${whereClause}
        GROUP BY action
        ORDER BY total DESC
        LIMIT 10
      `, params);

      return {
        total,
        denied,
        deniedRate: total > 0 ? ((denied / total) * 100).toFixed(2) + '%' : '0%',
        byType,
        byAction
      };

    } catch (error) {
      console.error('❌ 获取权限统计失败', { error: error.message });
      return null;
    }
  }

  /**
   * 清理旧日志
   * @param {number} days - 保留天数
   */
  async cleanOldLogs(days = 90) {
    try {
      const result = await query(`
        DELETE FROM system_logs
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [days]);

      console.log('🧹 清理旧日志完成', {
        days,
        deletedCount: result.affectedRows
      });

      return result.affectedRows;

    } catch (error) {
      console.error('❌ 清理旧日志失败', { error: error.message });
      return 0;
    }
  }
}

module.exports = new PermissionLogger();
