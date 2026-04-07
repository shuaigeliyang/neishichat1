/**
 * SQL后处理器 - 在执行前后进行权限验证和修正
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const logger = require('../utils/logger');

/**
 * 修正SQL中的WHERE条件，确保符合用户权限
 * @param {string} sql - 原始SQL
 * @param {Object} user - 用户信息 {id, type, role}
 * @returns {string} 修正后的SQL
 */
function fixSqlPermissions(sql, user) {
  const { id: userId, type: userType } = user;

  // 第一步：修正错误的表名
  if (userType === 'student') {
    // 学生不应该查询teachers或admins表获取个人信息
    if (sql.match(/FROM\s+teachers/i) && !sql.match(/JOIN\s+teachers/i)) {
      logger.warn('⚠️ 学生错误地查询了teachers表，修正为students表', { userId });
      sql = sql.replace(/FROM\s+teachers/i, 'FROM students');
      sql = sql.replace(/WHERE\s+teacher_id/i, 'WHERE student_id');
    }
    if (sql.match(/FROM\s+admins/i) && !sql.match(/JOIN\s+admins/i)) {
      logger.warn('⚠️ 学生错误地查询了admins表，修正为students表', { userId });
      sql = sql.replace(/FROM\s+admins/i, 'FROM students');
      sql = sql.replace(/WHERE\s+admin_id/i, 'WHERE student_id');
    }
  }

  if (userType === 'teacher') {
    // 教师不应该查询students或admins表获取个人信息
    if (sql.match(/FROM\s+students/i) && !sql.match(/JOIN\s+students/i)) {
      logger.warn('⚠️ 教师错误地查询了students表，修正为teachers表', { userId });
      sql = sql.replace(/FROM\s+students/i, 'FROM teachers');
      sql = sql.replace(/WHERE\s+student_id/i, 'WHERE teacher_id');
    }
    if (sql.match(/FROM\s+admins/i) && !sql.match(/JOIN\s+admins/i)) {
      logger.warn('⚠️ 教师错误地查询了admins表，修正为teachers表', { userId });
      sql = sql.replace(/FROM\s+admins/i, 'FROM teachers');
      sql = sql.replace(/WHERE\s+admin_id/i, 'WHERE teacher_id');
    }
  }

  // 第二步：检查SQL是否包含正确的WHERE条件
  if (userType === 'student' && sql.includes('student_id')) {
    // 检查是否包含当前学生的ID
    const studentIdPattern = new RegExp(`student_id\\s*=\\s*${userId}`, 'i');
    if (studentIdPattern.test(sql)) {
      return sql; // 已经正确，直接返回
    }

    // 包含student_id但ID不对，需要修正
    logger.info('⚠️ 检测到错误的student_id，进行修正', { userId });
    return sql.replace(/student_id\s*=\s*\d+/gi, `student_id = ${userId}`);
  }

  if (userType === 'teacher' && sql.includes('teacher_id')) {
    // 检查是否包含当前教师的ID
    const teacherIdPattern = new RegExp(`teacher_id\\s*=\\s*${userId}`, 'i');
    if (teacherIdPattern.test(sql)) {
      return sql; // 已经正确，直接返回
    }

    // 包含teacher_id但ID不对，需要修正
    logger.info('⚠️ 检测到错误的teacher_id，进行修正', { userId });
    return sql.replace(/teacher_id\s*=\s*\d+/gi, `teacher_id = ${userId}`);
  }

  if (userType === 'admin' && sql.includes('admin_id')) {
    // 检查是否包含当前管理员的ID
    const adminIdPattern = new RegExp(`admin_id\\s*=\\s*${userId}`, 'i');
    if (adminIdPattern.test(sql)) {
      return sql; // 已经正确，直接返回
    }

    // 包含admin_id但ID不对，需要修正
    logger.info('⚠️ 检测到错误的admin_id，进行修正', { userId });
    return sql.replace(/admin_id\s*=\s*\d+/gi, `admin_id = ${userId}`);
  }

  // 第三步：如果SQL没有WHERE条件，但查询的是敏感表，添加WHERE条件
  const sensitiveTables = {
    student: ['students', 'grades'],
    teacher: ['teachers', 'course_offerings'],
    admin: ['grades', 'students'] // 管理员查询个人数据时应受到限制
  };

  // 🔒 特殊处理：管理员查询个人数据时，返回空结果
  if (userType === 'admin') {
    const adminSensitiveTables = ['grades', 'students', 'teachers'];

    for (const table of adminSensitiveTables) {
      const fromPattern = new RegExp(`FROM\\s+${table}\\b`, 'i');
      const joinPattern = new RegExp(`JOIN\\s+${table}\\b`, 'i');

      // 如果管理员直接查询敏感表（不是JOIN）
      if (fromPattern.test(sql) && !joinPattern.test(sql)) {
        // 检查是否有WHERE条件（不管有没有WHERE，都要拦截）
        logger.warn('⚠️ 管理员查询敏感表，强制返回空结果', {
          table,
          userId,
          sql: sql.substring(0, 50)
        });

        // 替换WHERE条件为不可能的条件，确保返回空结果
        // 匹配：WHERE xxx.student_id = yyy 或 WHERE student_id = yyy
        const wherePattern = /WHERE\s+([\w.]+\.)?(student_id|teacher_id)\s*=\s*\d+/gi;
        const hasWhere = wherePattern.test(sql);

        if (hasWhere) {
          // 替换WHERE条件
          sql = sql.replace(wherePattern, 'WHERE 1 = 0');
          logger.info('🔧 已将管理员SQL的WHERE条件替换为 WHERE 1 = 0', {
            original: sql.substring(0, 100)
          });
        } else {
          // 没有WHERE条件，添加一个
          const whereClause = ' WHERE 1 = 0';
          const orderIndex = sql.toLowerCase().indexOf('order by');
          if (orderIndex > -1) {
            sql = sql.substring(0, orderIndex) + whereClause + ' ' + sql.substring(orderIndex);
          } else {
            sql = sql + whereClause;
          }
          logger.info('🔧 已为管理员SQL添加 WHERE 1 = 0', {
            original: sql.substring(0, 100)
          });
        }

        return sql;
      }
    }
  }

  // 检查是否查询敏感表
  for (const [type, tables] of Object.entries(sensitiveTables)) {
    if (userType === type) {
      for (const table of tables) {
        // 检查是否直接查询该表（不是JOIN）
        const fromPattern = new RegExp(`FROM\\s+${table}\\b`, 'i');
        const joinPattern = new RegExp(`JOIN\\s+${table}\\b`, 'i');

        if (fromPattern.test(sql) && !joinPattern.test(sql)) {
          // 查询敏感表但没有WHERE条件，自动添加
          if (!sql.toLowerCase().includes('where')) {
            logger.warn('⚠️ 检测到敏感表查询但没有WHERE条件，自动添加', {
              userType,
              table,
              userId
            });

            const whereClause = type === 'student'
              ? ` WHERE student_id = ${userId}`
              : type === 'teacher'
              ? ` WHERE teacher_id = ${userId}`
              : ` WHERE admin_id = ${userId}`;

            // 在ORDER BY之前添加WHERE
            const orderIndex = sql.toLowerCase().indexOf('order by');
            if (orderIndex > -1) {
              return sql.substring(0, orderIndex) + whereClause + ' ' + sql.substring(orderIndex);
            } else {
              return sql + whereClause;
            }
          }
        }
      }
    }
  }

  return sql;
}

/**
 * 验证查询结果是否属于当前用户
 * @param {Array} results - 查询结果
 * @param {Object} user - 用户信息
 * @param {string} sql - SQL语句（用于额外检查）
 * @returns {Object} { valid: boolean, message: string }
 */
function validateQueryResults(results, user, sql) {
  const { id: userId, type: userType } = user;

  if (!results || results.length === 0) {
    return { valid: true, message: '查询结果为空' };
  }

  // 🔒 管理员额外安全检查：确保不返回个人敏感数据
  if (userType === 'admin') {
    // 检查SQL是否查询了敏感表
    const queriesSensitiveTable =
      (sql && sql.includes('grades')) ||
      (sql && sql.includes('FROM students')) ||
      (sql && sql.includes('FROM teachers'));

    // 检查结果是否包含个人敏感数据（即使字段被重命名）
    const hasPersonalData = results.length > 0 && (
      results.some(r => r.student_id) ||
      results.some(r => r.teacher_id) ||
      results.some(r => r.phone) ||
      results.some(r => r.email) ||
      results.some(r => r.name) ||  // 即使被AS重命名
      queriesSensitiveTable  // 如果查询了敏感表，也认为有个人数据
    );

    if (hasPersonalData && queriesSensitiveTable) {
      logger.error('❌ 安全警告：管理员查询结果包含个人敏感数据！', {
        userId,
        rowCount: results.length,
        sql: sql.substring(0, 100),
        hasStudentId: results.some(r => r.student_id),
        hasName: results.some(r => r.name),
        queriesGrades: sql.includes('grades'),
        queriesStudents: sql.includes('FROM students')
      });

      return {
        valid: false,
        message: `安全警告：管理员账号不支持查询个人敏感数据。请使用管理后台的数据管理功能。`
      };
    }
  }

  // 检查是否是单条记录查询（个人信息查询）
  if (results.length === 1) {
    const result = results[0];

    if (userType === 'student' && result.student_id) {
      if (result.student_id !== userId) {
        logger.error('❌ 安全警告：学生查询了其他学生的信息！', {
          currentUserId: userId,
          queriedStudentId: result.student_id
        });
        return {
          valid: false,
          message: `安全警告：您查询的信息不属于您当前登录的账号。`
        };
      }
    }

    if (userType === 'teacher' && result.teacher_id) {
      if (result.teacher_id !== userId) {
        logger.error('❌ 安全警告：教师查询了其他教师的信息！', {
          currentUserId: userId,
          queriedTeacherId: result.teacher_id
        });
        return {
          valid: false,
          message: `安全警告：您查询的信息不属于您当前登录的账号。`
        };
      }
    }
  }

  // 检查是否是多条记录查询
  if (results.length > 1) {
    // 验证每条记录
    for (const result of results) {
      if (userType === 'student' && result.student_id) {
        if (result.student_id !== userId) {
          logger.error('❌ 安全警告：学生查询结果包含其他学生的信息！', {
            currentUserId: userId,
            invalidStudentId: result.student_id
          });
          return {
            valid: false,
            message: `安全警告：查询结果包含不属于您的信息。`
          };
        }
      }

      if (userType === 'teacher' && result.teacher_id) {
        if (result.teacher_id !== userId) {
          // 教师可以查询所教班级的学生，这个是允许的
          // 但如果查询的是其他教师信息，则不允许
          if (result.teacher_id && result.teacher_name && !result.student_id) {
            // 查询的是教师列表
            continue; // 允许
          }
        }
      }
    }
  }

  return { valid: true, message: '查询结果验证通过' };
}

module.exports = {
  fixSqlPermissions,
  validateQueryResults
};
