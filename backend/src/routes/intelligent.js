/**
 * 智能查询路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：处理智能SQL查询请求
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');
const { generateSQL } = require('../services/sqlGenerator');
const { validateSQL } = require('../middlewares/sqlValidator');
const contextManager = require('../services/contextManager');
const { evaluateResult, generateResultMessage, extractEntities, validateRowCount } = require('../services/resultEvaluator');
const { fixSqlPermissions, validateQueryResults } = require('../services/sqlPostProcessor');
const logger = require('../utils/logger');

/**
 * 智能查询接口
 * POST /api/intelligent/query
 *
 * 这是核心接口，处理所有智能查询请求
 */
router.post('/query', authenticate, async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, sessionId } = req.body;
    const { id: userId, type: userType, ...userContext } = req.user;

    // 参数验证
    if (!message) {
      return error(res, '查询内容不能为空', 400);
    }

    if (!sessionId) {
      return error(res, '会话ID不能为空', 400);
    }

    logger.info('🧠 智能查询请求', {
      message: message.substring(0, 50),
      sessionId,
      userType,
      userId
    });

    // 1. 保存用户消息到上下文
    contextManager.addMessage(sessionId, 'user', message);

    // 🔒 特殊处理：查询"我的挂科记录"
    // 权限控制：只有学生可以查询自己的挂科记录
    if (
      (message.includes('我的挂科') || message.includes('我的挂科记录') || message.includes('挂科记录')) &&
      userType !== 'student'
    ) {
      logger.info('🚫 非学生用户尝试查询挂科记录', { userId, userType, message });

      const friendlyMessage = `💡 **温馨提示**

${userType === 'teacher' ? '教师' : '管理员'}账号主要用于教学或管理工作，不支持查询学生的挂科记录。

如果您需要查询某个学生的挂科情况，请：
- 使用管理后台的学生成绩管理功能
- 或直接咨询学生本人

学生隐私数据需要严格保护，感谢您的理解！`;

      contextManager.addMessage(sessionId, 'assistant', friendlyMessage);

      return success(res, {
        answer: friendlyMessage,
        data: [],
        meta: {
          type: 'permission_denied',
          userType: userType,
          reason: 'non_student_cannot_query_failed_grades'
        }
      });
    }

    // 🔒 特殊处理：学生查询"我的挂科记录"
    if (
      userType === 'student' &&
      (message.includes('我的挂科') || message.includes('我的挂科记录') || message.includes('挂科记录'))
    ) {
      logger.info('📊 学生查询挂科记录', { userId, message });

      try {
        // 直接查询grades表，查找挂科记录（total_score < 60 或 is_retake = 1）
        const failedGradesSql = `
          SELECT
            g.grade_id AS '成绩ID',
            c.course_name AS '课程名称',
            c.course_code AS '课程代码',
            g.total_score AS '总评成绩',
            co.semester AS '学期',
            g.is_retake AS '是否重修',
            t.name AS '授课教师'
          FROM grades g
          LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
          LEFT JOIN courses c ON co.course_id = c.course_id
          LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
          WHERE g.student_id = ${userId}
            AND (g.total_score < 60 OR g.is_retake = 1)
          ORDER BY co.semester DESC, c.course_name
        `;

        const failedGrades = await query(failedGradesSql);

        logger.info('✅ 挂科记录查询成功', {
          userId,
          failedCount: failedGrades.length
        });

        // 如果有挂科记录，返回记录
        if (failedGrades.length > 0) {
          const resultMessage = `📊 **你的挂科记录**

共找到 **${failedGrades.length}** 门挂科课程：

| 课程名称 | 课程代码 | 成绩 | 学期 | 授课教师 |
|---------|---------|------|------|----------|
${failedGrades.map(g =>
  `| ${g['课程名称']} | ${g['课程代码']} | ${g['总评成绩']}分 | ${g['学期']} | ${g['授课教师']} |`
).join('\n')}

💡 **建议：**
1. 及时参加补考或重修
2. 分析挂科原因，制定改进计划
3. 寻求老师或同学的帮助
4. 调整学习方法，避免再次挂科`;

          contextManager.addMessage(sessionId, 'assistant', resultMessage);

          return success(res, {
            answer: resultMessage,
            data: failedGrades,
            meta: {
              type: 'failed_grades',
              count: failedGrades.length,
              hasFailedCourses: true
            }
          });
        }

        // 如果没有挂科记录，返回特殊标记，让前端切换到普通聊天
        logger.info('🎉 学生没有挂科记录', { userId });

        const noFailMessage = {
          switchToChat: true,
          praiseMessage: `🎉 **太棒了！**

根据查询结果，你目前**没有挂科记录**！

🌟 **你的表现非常优秀！**
- 所有课程都及格了
- 学习态度认真
- 继续保持这个好状态！

💪 **继续保持：**
- 坚持良好的学习习惯
- 按时完成作业和复习
- 积极参与课堂互动
- 遇到问题及时请教

加油，你是最棒的！🎊`
        };

        contextManager.addMessage(sessionId, 'assistant', noFailMessage.praiseMessage);

        return success(res, {
          answer: noFailMessage.praiseMessage,
          data: [],
          meta: {
            type: 'no_failed_grades',
            hasFailedCourses: false,
            switchToChat: true  // 告诉前端切换到普通聊天
          }
        });

      } catch (err) {
        logger.error('❌ 挂科记录查询失败', {
          error: err.message,
          userId
        });

        // 如果查询失败，降级到普通AI生成SQL
        logger.info('⬇️ 降级到AI生成SQL');
      }
    }

    // 2. 生成SQL（结合上下文）
    const context = contextManager.getContext(sessionId);
    const sqlResult = await generateSQL(message, context, { type: userType, id: userId });

    if (!sqlResult.success) {
      logger.error('SQL生成失败', {
        error: sqlResult.error,
        message: message,
        sessionId
      });

      // 保存错误信息到上下文
      contextManager.addMessage(sessionId, 'assistant', `抱歉，SQL生成失败：${sqlResult.error}`);

      return error(res, `SQL生成失败: ${sqlResult.error}`, 500);
    }

    const { sql: generatedSql, explanation, expectedRows } = sqlResult;

    logger.info('📝 生成的SQL', {
      sql: generatedSql.substring(0, 100),
      explanation,
      expectedRows,
      sessionId
    });

    // 4. 验证SQL安全性
    const validation = validateSQL(generatedSql);
    if (!validation.safe) {
      logger.warn('SQL安全验证失败', {
        error: validation.error,
        sql: generatedSql.substring(0, 200),
        sessionId
      });

      contextManager.addMessage(sessionId, 'assistant', `SQL安全验证失败：${validation.error}`);

      return error(res, `SQL安全验证失败: ${validation.error}`, 403);
    }

    // 记录SQL验证警告
    if (validation.warnings && validation.warnings.length > 0) {
      logger.info('SQL验证警告', { warnings: validation.warnings });
    }

    // 4. 权限修正（在执行SQL前）
    const originalSql = generatedSql;
    const fixedSql = fixSqlPermissions(generatedSql, { id: userId, type: userType, ...userContext });

    let sqlToExecute = generatedSql;
    if (originalSql !== fixedSql) {
      logger.info('🔧 SQL权限修正', {
        original: originalSql.substring(0, 100),
        fixed: fixedSql.substring(0, 100),
        userId,
        userType
      });

      sqlToExecute = fixedSql;
    }

    // 5. 执行查询
    let queryResult;
    let queryTime;

    try {
      const queryStart = Date.now();
      queryResult = await query(sqlToExecute);
      queryTime = Date.now() - queryStart;

      logger.info('✅ 查询执行成功', {
        rowCount: queryResult.length,
        queryTime: `${queryTime}ms`,
        userId,
        userType
      });

    } catch (err) {
      logger.error('❌ 查询执行失败', {
        error: err.message,
        sql: sqlToExecute.substring(0, 100)
      });

      contextManager.addMessage(sessionId, 'assistant', `查询执行失败：${err.message}`);

      return error(res, `查询执行失败: ${err.message}`, 500);
    }

    // 6. 验证查询结果的权限
    const resultValidation = validateQueryResults(queryResult, { id: userId, type: userType }, sqlToExecute);

    if (!resultValidation.valid) {
      logger.error('❌ 查询结果权限验证失败', {
        message: resultValidation.message,
        userId,
        userType,
        rowCount: queryResult.length
      });

      contextManager.addMessage(sessionId, 'assistant', resultValidation.message);

      return error(res, resultValidation.message, 403);
    }

    logger.info('✅ 查询结果权限验证通过', {
      userId,
      userType,
      rowCount: queryResult.length
    });

    // 7. 验证结果数量
    const rowCountValidation = validateRowCount(queryResult.length);
    if (!rowCountValidation.valid) {
      logger.warn('结果数量超过限制', {
        rowCount: queryResult.length,
        maxAllowed: validateRowCount.CONFIG.maxDownloadRows
      });

      contextManager.addMessage(sessionId, 'assistant', rowCountValidation.error);

      return error(res, rowCountValidation.error, 403);
    }

    // 8. 评估结果并决定返回方式
    const evaluation = evaluateResult(queryResult, sqlToExecute);

    // 🔒 特殊处理：管理员查询个人数据返回空结果时，显示友好提示
    if (userType === 'admin' && queryResult.length === 0) {
      const adminPersonalDataQuery =
        sqlToExecute.includes('grades') ||
        sqlToExecute.includes('students') ||
        sqlToExecute.includes('teachers');

      if (adminPersonalDataQuery) {
        logger.info('🔒 管理员查询个人数据，返回友好提示', {
          sql: sqlToExecute.substring(0, 50)
        });

        const friendlyMessage = `💡 **温馨提示**

管理员账号主要用于系统管理操作，不关联个人成绩或学生数据。

如果您需要查询个人成绩或学生信息，请：
1. 使用您的教师账号或学生账号登录
2. 或通过管理后台的数据管理功能进行查询

如有疑问，请联系系统管理员。`;

        // 构建响应数据
        const responseData = {
          type: 'intelligent_query',
          responseType: 'message',
          message: friendlyMessage,
          explanation: '管理员账号不支持查询个人数据',
          rowCount: 0,
          queryTime: queryTime,
          sql: sqlToExecute,
          data: null,
          downloadUrl: null,
          suggestions: [
            '使用教师账号或学生账号登录',
            '通过管理后台查询数据'
          ]
        };

        // 保存助手响应到上下文
        contextManager.addMessage(sessionId, 'assistant', friendlyMessage, {
          result: [],
          sql: sqlToExecute,
          rowCount: 0,
          entities: [],
          queryTime: queryTime
        });

        // 计算总处理时间
        const totalTime = Date.now() - startTime;
        logger.info('🎉 管理员查询提示完成', {
          totalTime: `${totalTime}ms`,
          responseType: 'message'
        });

        // 返回成功响应
        return success(res, {
          answer: JSON.stringify(responseData),
          intent: 'intelligent_query',
          metadata: {
            totalTime,
            queryTime,
            rowCount: 0,
            sql: sqlToExecute
          }
        }, '查询成功');
      }
    }

    // 🔒 特殊处理：教师查询"我的成绩"时，显示友好提示
    if (userType === 'teacher') {
      // 检测是否是查询"我的成绩"的模式
      const isAskingOwnGrades =
        (message.includes('我的成绩') ||
         message.includes('我的分数') ||
         message.includes('我的考分') ||
         message.includes('我的学业成绩') ||
         message === '我的成绩是多少') &&
        (sqlToExecute.includes('grades') ||
         sqlToExecute.includes('FROM grades'));

      if (isAskingOwnGrades) {
        logger.info('🔒 教师查询"我的成绩"，返回友好提示', {
          sql: sqlToExecute.substring(0, 50)
        });

        const friendlyMessage = `💡 **温馨提示**

教师账号不关联个人成绩数据。

如果您需要查询：
- **我教授的课程**：请说"我的课表"或"我教的课程"
- **我教的学生的成绩**：请说"我的学生的成绩"或"我班级的成绩"
- **某个学生的成绩**：请说"[学生姓名]的成绩"或"[学号]的成绩"

**示例：**
- "我的学生的成绩" - 查看您教授的所有课程的学生成绩
- "数据结构的成绩" - 查看某门课程的学生成绩
- "陈丽的成绩" - 查看某个学生的成绩

如有疑问，请联系系统管理员。`;

        // 构建响应数据
        const responseData = {
          type: 'intelligent_query',
          responseType: 'message',
          message: friendlyMessage,
          explanation: '教师账号不关联个人成绩，建议查询学生成绩',
          rowCount: 0,
          queryTime: queryTime,
          sql: sqlToExecute,
          data: null,
          downloadUrl: null,
          suggestions: [
            '我的学生的成绩 - 查看您教授课程的学生成绩',
            '我的课表 - 查看您教授的课程列表',
            '陈丽的成绩 - 查看某个学生的成绩'
          ]
        };

        // 保存助手响应到上下文
        contextManager.addMessage(sessionId, 'assistant', friendlyMessage, {
          result: [],
          sql: sqlToExecute,
          rowCount: 0,
          entities: [],
          queryTime: queryTime
        });

        // 计算总处理时间
        const totalTime = Date.now() - startTime;
        logger.info('🎉 教师查询提示完成', {
          totalTime: `${totalTime}ms`,
          responseType: 'message'
        });

        // 返回成功响应
        return success(res, {
          answer: JSON.stringify(responseData),
          intent: 'intelligent_query',
          metadata: {
            totalTime,
            queryTime,
            rowCount: 0,
            sql: sqlToExecute
          }
        }, '查询成功');
      }
    }

    // 7. 生成用户友好的消息
    const resultMessage = generateResultMessage(evaluation, explanation);

    // 8. 提取实体信息（用于上下文）
    const entities = extractEntities(queryResult, sqlToExecute);

    // 9. 构建响应数据
    const responseData = {
      type: 'intelligent_query',
      responseType: evaluation.type,
      message: resultMessage,
      explanation: explanation,
      rowCount: evaluation.rowCount,
      queryTime: queryTime,
      sql: sqlToExecute,
      data: evaluation.displayData, // 可能为null
      downloadUrl: evaluation.downloadAvailable ? `/api/intelligent/download/${sessionId}` : null,
      suggestions: sqlResult.suggestions || []
    };

    // 10. 保存助手响应到上下文
    contextManager.addMessage(sessionId, 'assistant', resultMessage, {
      result: queryResult,
      sql: sqlToExecute,
      rowCount: evaluation.rowCount,
      entities: entities,
      queryTime: queryTime
    });

    // 11. 计算总处理时间
    const totalTime = Date.now() - startTime;
    logger.info('🎉 智能查询完成', {
      totalTime: `${totalTime}ms`,
      responseType: evaluation.type,
      rowCount: evaluation.rowCount
    });

    // 12. 返回成功响应
    return success(res, {
      answer: JSON.stringify(responseData),
      intent: 'intelligent_query',
      metadata: {
        totalTime,
        queryTime,
        rowCount: evaluation.rowCount,
        sql: sqlToExecute
      }
    }, '查询成功');

  } catch (err) {
    const totalTime = Date.now() - startTime;
    logger.error('❌ 智能查询错误', {
      error: err.message,
      stack: err.stack,
      totalTime: `${totalTime}ms`
    });

    return error(res, '智能查询失败: ' + err.message, 500);
  }
});

/**
 * 下载查询结果
 * GET /api/intelligent/download/:sessionId
 *
 * 下载指定会话的最后一次查询结果
 */
router.get('/download/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { id: userId, type: userType } = req.user;

    logger.info('📥 下载查询结果', { sessionId, userType, userId });

    // 从上下文中获取最后一次查询结果
    const context = contextManager.getContext(sessionId);

    // 查找最后一次助手的消息（包含查询结果）
    const lastAssistantMessage = [...context].reverse().find(
      msg => msg.role === 'assistant' && msg.metadata?.result
    );

    if (!lastAssistantMessage) {
      logger.warn('未找到查询结果', { sessionId });
      return error(res, '未找到查询结果，请先执行查询', 404);
    }

    const { result, sql, rowCount } = lastAssistantMessage.metadata;

    if (!result || result.length === 0) {
      logger.warn('查询结果为空', { sessionId });
      return error(res, '查询结果为空', 404);
    }

    logger.info('开始生成Excel', {
      sessionId,
      rowCount,
      userType
    });

    // 导出为Excel（使用现有的导出服务）
    const exportExcel = require('../services/exportExcel');

    // 转换为适合Excel的格式
    const excelData = prepareDataForExcel(result);

    // 生成Excel buffer
    const buffer = await exportQueryResultToBuffer(excelData, sql);

    // 设置响应头
    const filename = `query_result_${sessionId}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.setHeader('Content-Length', buffer.length);

    logger.info('✅ Excel生成成功', {
      sessionId,
      filename,
      size: buffer.length
    });

    res.send(buffer);

  } catch (err) {
    logger.error('❌ 下载失败', {
      error: err.message,
      stack: err.stack
    });
    error(res, '下载失败: ' + err.message, 500);
  }
});

/**
 * 获取上下文信息
 * GET /api/intelligent/context/:sessionId
 *
 * 获取指定会话的上下文信息
 */
router.get('/context/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const context = contextManager.getContext(sessionId);
    const keyInfo = contextManager.extractKeyInfo(sessionId);

    logger.info('获取上下文信息', { sessionId, contextLength: context.length });

    return success(res, {
      contextLength: context.length,
      keyInfo: keyInfo,
      summary: contextManager.buildContextSummary(sessionId)
    }, '获取成功');

  } catch (err) {
    logger.error('获取上下文失败', { error: err.message });
    error(res, '获取上下文失败', 500);
  }
});

/**
 * 清除上下文
 * DELETE /api/intelligent/context/:sessionId
 *
 * 清除指定会话的上下文
 */
router.delete('/context/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    contextManager.clearContext(sessionId);

    logger.info('清除上下文', { sessionId });

    return success(res, { message: '上下文已清除' }, '清除成功');

  } catch (err) {
    logger.error('清除上下文失败', { error: err.message });
    error(res, '清除上下文失败', 500);
  }
});

/**
 * 获取系统统计信息
 * GET /api/intelligent/stats
 *
 * 获取智能查询系统的统计信息
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = contextManager.getStats();

    logger.info('获取系统统计', stats);

    return success(res, stats, '获取成功');

  } catch (err) {
    logger.error('获取统计信息失败', { error: err.message });
    error(res, '获取统计信息失败', 500);
  }
});

// ============== 辅助函数 ==============

/**
 * 准备数据用于Excel导出
 * @param {Array} data - 查询结果
 * @returns {Array}
 */
function prepareDataForExcel(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // 转换列名（如果需要）
  return data.map(row => {
    const newRow = {};
    for (const [key, value] of Object.entries(row)) {
      // 可以在这里进行列名转换
      newRow[key] = value;
    }
    return newRow;
  });
}

/**
 * 导出查询结果到Excel Buffer
 * @param {Array} data - 数据
 * @param {string} sql - SQL语句
 * @returns {Promise<Buffer>}
 */
async function exportQueryResultToBuffer(data, sql) {
  const ExcelJS = require('exceljs');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('查询结果');

  if (data.length === 0) {
    return await workbook.xlsx.writeBuffer();
  }

  // 获取列名
  const columns = Object.keys(data[0]);
  worksheet.columns = columns.map(col => ({
    header: col,
    key: col,
    width: 20
  }));

  // 添加标题行（SQL信息）
  worksheet.insertRow(1, ['查询结果', '', '', '', '', '', '', '', '', '']);
  worksheet.insertRow(2, ['SQL:', sql.substring(0, 50) + '...', '', '', '', '', '', '', '', '', '']);
  worksheet.insertRow(3, ['生成时间:', new Date().toLocaleString('zh-CN'), '', '', '', '', '', '', '', '', '']);
  worksheet.insertRow(4, ['总行数:', data.length, '', '', '', '', '', '', '', '', '']);
  worksheet.insertRow(5, []);

  // 添加表头
  const headerRow = worksheet.getRow(6);
  headerRow.values = columns;
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // 添加数据
  data.forEach(row => {
    worksheet.addRow(row);
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = router;
