/**
 * 查询权限验证器（集成日志）
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：验证用户的查询权限，防止越权访问
 */

const { query } = require('../config/database');
const permissionLogger = require('../services/permissionLogger');

class QueryPermissionValidator {
  /**
   * 验证查询权限（集成日志记录）
   * @param {Object} user - 用户信息 { type, id }
   * @param {string} intent - 查询意图
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} { allowed, message, filter }
   */
  async validate(user, intent, params = {}) {
    const { type: userType, id: userId } = user;

    console.log('🔐 权限验证开始', { userType, userId, intent });

    let result = {
      allowed: false,
      filter: {},
      message: ''
    };

    // 个人资料查询 - 只能查自己
    if (intent === '个人资料' || intent === '个人信息') {
      result = {
        allowed: true,
        filter: { [userType + '_id']: userId },
        message: '只能查询自己的信息'
      };
    }

    // 成绩查询
    else if (intent === '成绩查询' || intent === '成绩') {
      if (userType === 'student') {
        result = {
          allowed: true,
          filter: { student_id: userId },
          message: '只能查询自己的成绩'
        };
      } else if (userType === 'teacher') {
        const classIds = await this.getTeacherClassIds(userId);
        result = {
          allowed: true,
          filter: classIds.length > 0 ? { student_id: classIds } : {},
          message: '可查询授课班级的学生成绩'
        };
      } else if (userType === 'admin') {
        result = {
          allowed: true,
          filter: {},
          message: '管理员权限'
        };
      } else {
        result = {
          allowed: false,
          filter: {},
          message: '只有学生和教师可以查询成绩'
        };
      }
    }

    // 课程查询
    else if (intent === '课程查询' || intent === '课程' || intent === '课表') {
      if (userType === 'student') {
        const classInfo = await this.getStudentClassInfo(userId);
        result = {
          allowed: true,
          filter: classInfo ? { class_id: classInfo.class_id } : {},
          message: '只能查询自己班级的课程'
        };
      } else if (userType === 'teacher') {
        result = {
          allowed: true,
          filter: { teacher_id: userId },
          message: '只能查询自己授课的课程'
        };
      } else if (userType === 'admin') {
        result = {
          allowed: true,
          filter: {},
          message: '管理员权限'
        };
      } else {
        result = {
          allowed: false,
          filter: {},
          message: '未知用户类型'
        };
      }
    }

    // 管理办法查询 - 所有用户都可以
    else if (intent === '管理办法') {
      result = {
        allowed: true,
        filter: {},
        message: '可以查询管理办法'
      };
    }

    // 默认：管理员可以访问所有
    else if (userType === 'admin') {
      result = {
        allowed: true,
        filter: {},
        message: '管理员权限'
      };
    }

    // 其他情况：拒绝访问
    else {
      console.warn('⚠️ 权限验证失败', { userType, userId, intent });
      result = {
        allowed: false,
        filter: {},
        message: '权限不足，无法执行此查询'
      };
    }

    // 记录权限验证日志
    await permissionLogger.logQueryPermission(user, intent, result.allowed, result.message);

    return result;
  }

  /**
   * 获取教师授课的班级ID列表
   * @param {number} teacherId - 教师ID
   * @returns {Promise<Array>} 班级ID列表
   */
  async getTeacherClassIds(teacherId) {
    try {
      const result = await query(`
        SELECT DISTINCT c.class_id
        FROM course_offerings co
        LEFT JOIN classes c ON co.class_id = c.class_id
        WHERE co.teacher_id = ? AND co.status = 1
      `, [teacherId]);

      return result.map(r => r.class_id);
    } catch (error) {
      console.error('❌ 获取教师班级失败', { error: error.message, teacherId });
      return [];
    }
  }

  /**
   * 获取学生的班级信息
   * @param {number} studentId - 学生ID
   * @returns {Promise<Object>} 班级信息
   */
  async getStudentClassInfo(studentId) {
    try {
      const result = await query(`
        SELECT class_id FROM students WHERE student_id = ?
      `, [studentId]);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('❌ 获取学生班级失败', { error: error.message, studentId });
      return null;
    }
  }
}

module.exports = new QueryPermissionValidator();
