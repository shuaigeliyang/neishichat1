/**
 * AI对话路由（增强版）
 * @author 内师智能体系统 (￣▽￣)ﾉ
 * 更新：集成权限控制和上下文管理
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');
const { chat, detectIntent } = require('../services/anthropicAI');
const contextService = require('../services/contextService');
const queryPermissionValidator = require('../validators/queryPermissionValidator');
const downloadPermissionValidator = require('../validators/downloadPermissionValidator');
const { checkFormDownloadIntent } = require('../services/formIntentHelper');
const realFormGenerator = require('../services/realFormGeneratorService');

/**
 * AI对话接口（增强版）
 * POST /api/chat
 * 更新：集成权限验证和上下文管理
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const { id: userId, type: userType } = req.user;

    if (!message) {
      return error(res, '消息不能为空', 400);
    }

    console.log('💬 收到对话请求', { userId, userType, sessionId, message: message.substring(0, 50) });

    // ========== 步骤1：检查表单下载请求（新增！）==========
    const formCheck = await checkFormDownloadIntent(message);

    if (formCheck.isFormRequest) {
      console.log('📝 检测到表单下载请求', formCheck);

      if (formCheck.formInfo && formCheck.formInfo.recognized) {
        // 识别成功，生成表单
        try {
          // 获取学生信息
          let studentInfo = null;
          if (userType === 'student') {
            const students = await query(`
              SELECT s.*, c.class_name, m.major_name, col.college_name
              FROM students s
              LEFT JOIN classes c ON s.class_id = c.class_id
              LEFT JOIN majors m ON c.major_id = m.major_id
              LEFT JOIN colleges col ON m.college_id = col.college_id
              WHERE s.student_id = ?
            `, [userId]);
            studentInfo = students[0];
          } else {
            studentInfo = {
              name: '示例学生',
              student_code: '20240001'
            };
          }

          // 生成表单
          const result = await realFormGenerator.generateForm(
            formCheck.formInfo.templateName,
            studentInfo,
            userType
          );

          const answer = `✅ 已为您生成表单：**${result.templateName}**\n\n点击下方按钮即可下载Word文件。`;

          // 保存对话历史
          await query(`
            INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [userType, userId, message, answer, 'form_download', sessionId || null]);

          // 更新上下文
          contextService.updateContext(sessionId, message, answer);

          return success(res, {
            answer: JSON.stringify({
              success: true,
              type: 'form_download',
              downloadUrl: result.downloadUrl,
              fileName: result.fileName,
              templateName: result.templateName,
              message: answer
            }),
            intent: 'form_download'
          });
        } catch (err) {
          console.error('❌ 表单生成失败:', err);
          return error(res, '表单生成失败：' + err.message, 500);
        }
      } else {
        // 识别失败，返回建议
        const suggestions = formCheck.similarForms || [];
        let suggestionText = '';

        if (suggestions.length > 0) {
          suggestionText = '\n\n**💡 您是不是想要下载以下表单？**\n' +
            suggestions.map((f, i) =>
              `${i + 1}. ${f.template_name}\n   （${f.project_name}）`
            ).join('\n\n');
        } else {
          suggestionText = '\n\n**💡 提示：**\n' +
            '您可以说"下载[表单名称]"来生成具体的表单文件。\n\n' +
            '例如：\n' +
            '- "下载转专业申请表"\n' +
            '- "生成奖学金申请表"\n' +
            '- "我要竞赛申请表"';
        }

        const answer = `抱歉，我没有识别到您要生成的表单名称。${suggestionText}`;

        // 保存对话历史
        await query(`
          INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [userType, userId, message, answer, 'form_not_recognized', sessionId || null]);

        // 更新上下文
        contextService.updateContext(sessionId, message, answer);

        return success(res, {
          answer,
          intent: 'form_not_recognized'
        });
      }
    }

    // ========== 步骤2：获取对话上下文 ==========
    const maxTurns = 5; // 保留最近5轮对话
    const conversationHistory = await contextService.getContext(sessionId, maxTurns);

    console.log('📋 上下文信息', { sessionId, historyLength: conversationHistory.length });

    // ========== 步骤2：检查下载请求（添加权限验证）==========
    if (message.includes('下载') || message.includes('导出')) {
      let downloadType = null;

      if (message.includes('个人信息') || message.includes('个人')) {
        downloadType = '个人信息';
      } else if (message.includes('成绩') || message.includes('成绩单')) {
        downloadType = '成绩单';
      } else if (message.includes('班级')) {
        downloadType = '班级信息';
      } else if (message.includes('学院')) {
        downloadType = '学院信息';
      }

      if (downloadType) {
        // ========== 新增：权限验证 ==========
        const permission = await downloadPermissionValidator.validate(req.user, downloadType);

        if (!permission.allowed) {
          // 权限不足，返回友好提示
          const answer = `抱歉，${permission.message}。如果您确实需要此数据，请联系您的老师或管理员。`;

          // 保存对话历史
          await query(`
            INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [userType, userId, message, answer, 'permission_denied', sessionId || null]);

          // 更新上下文
          contextService.updateContext(sessionId, message, answer);

          console.log('⚠️ 下载权限拒绝', { downloadType, userType });
          return success(res, {
            answer,
            intent: 'permission_denied'
          }, '查询成功');
        }

        // 权限验证通过，生成下载链接
        let downloadUrl = null;

        if (downloadType === '个人信息') {
          downloadUrl = '/api/export/student/profile';
        } else if (downloadType === '成绩单') {
          if (userType === 'student') {
            downloadUrl = '/api/export/student/grades';
          } else if (userType === 'teacher') {
            downloadUrl = '/api/export/teacher/class-grades';
          } else if (userType === 'admin') {
            downloadUrl = '/api/export/admin/all-grades';
          }
        } else if (downloadType === '班级信息') {
          // 学生不允许下载班级信息，已经在权限验证中拒绝了
          // 教师可以导出授课班级，管理员可以导出所有班级
          if (userType === 'teacher') {
            downloadUrl = '/api/export/teacher/classes';
          } else if (userType === 'admin') {
            downloadUrl = '/api/export/admin/all-classes';
          }
          // 学生的情况在权限验证中已经被拒绝，不会走到这里
        } else if (downloadType === '学院信息') {
          downloadUrl = '/api/export/admin/colleges';
        }

        if (downloadUrl) {
          const answer = `✅ 已为您生成${downloadType}的下载链接，点击下方按钮即可下载Excel文件`;

          // 保存对话历史
          await query(`
            INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [userType, userId, message, answer, 'download', sessionId || null]);

          // 更新上下文
          contextService.updateContext(sessionId, message, answer);

          return success(res, {
            answer: JSON.stringify({
              success: true,
              type: 'download',
              downloadType,
              downloadUrl,
              message: answer
            }),
            intent: 'download'
          }, '查询成功');
        }
      }
    }

    // ========== 步骤3：调用AI（传递上下文）==========
    const aiResponse = await chat(message, conversationHistory);

    // chat函数返回的是字符串，不是对象
    const answer = typeof aiResponse === 'string' ? aiResponse : (aiResponse.answer || '');
    if (!answer) {
      return error(res, 'AI服务暂时不可用', 500);
    }

    let queryResult = null;
    let finalIntent = 'chat';

    // ========== 步骤4：处理查询指令（添加权限验证）==========
    try {
      const jsonMatch = answer.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.type === 'download') {
          await query(`
            INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [userType, userId, message, parsed.message, 'download', sessionId || null]);

          // 更新上下文
          contextService.updateContext(sessionId, message, parsed.message);

          return success(res, {
            answer: JSON.stringify(parsed),
            intent: 'download'
          }, '查询成功');
        }

        if (parsed.type === 'query') {
          const intent = parsed.intent || '';
          finalIntent = intent;

          // ========== 新增：权限验证 ==========
          const permission = await queryPermissionValidator.validate(req.user, intent);

          if (!permission.allowed) {
            answer = `抱歉，${permission.message}。如果您需要此信息，请联系相关老师或管理员。`;

            // 保存对话历史
            await query(`
              INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [userType, userId, message, answer, 'permission_denied', sessionId || null]);

            // 更新上下文
            contextService.updateContext(sessionId, message, answer);

            console.log('⚠️ 查询权限拒绝', { intent, userType });
            return success(res, {
              answer,
              intent: 'permission_denied'
            }, '查询成功');
          }

          // 权限验证通过，执行查询
          // 查询个人资料
          if (intent === '个人资料' || intent === '个人信息') {
            queryResult = await query(`
              SELECT s.*, c.class_name, m.major_name, col.college_name, col.college_id
              FROM students s
              LEFT JOIN classes c ON s.class_id = c.class_id
              LEFT JOIN majors m ON c.major_id = m.major_id
              LEFT JOIN colleges col ON m.college_id = col.college_id
              WHERE s.student_id = ?
            `, [userId]);

            if (queryResult && queryResult.length > 0) {
              const data = queryResult[0];
              delete data.password;
              answer = JSON.stringify({ success: true, type: 'profile', data });
            }
          }
          // 查询成绩（已自动应用权限过滤器）
          else if (intent === '成绩查询' || intent === '成绩') {
            if (userType === 'student') {
              queryResult = await query(`
                SELECT
                  g.*, c.course_name,
                  co.course_code, co.credits, co.course_type,
                  t.name as teacher_name
                FROM grades g
                LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
                LEFT JOIN courses c ON co.course_id = c.course_id
                LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
                WHERE g.student_id = ?
                ORDER BY co.semester DESC
              `, [userId]);

              answer = JSON.stringify({
                success: true,
                type: 'grades',
                data: queryResult,
                message: `为您找到 ${queryResult.length} 条成绩记录`
              });
            } else if (userType === 'teacher') {
              // 教师查询授课班级的学生成绩
              const classIds = await queryPermissionValidator.getTeacherClassIds(userId);

              if (classIds.length > 0) {
                queryResult = await query(`
                  SELECT g.*, s.name as student_name, s.student_code,
                         c.course_name, co.course_code, co.credits
                  FROM grades g
                  LEFT JOIN students s ON g.student_id = s.student_id
                  LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
                  LEFT JOIN courses c ON co.course_id = c.course_id
                  WHERE s.class_id IN (?)
                  ORDER BY co.semester DESC
                `, [classIds]);

                answer = JSON.stringify({
                  success: true,
                  type: 'grades',
                  data: queryResult,
                  message: `为您找到 ${queryResult.length} 条学生成绩记录`
                });
              } else {
                answer = '您还没有授课班级的学生成绩数据～';
              }
            }
          }
          // 查询课程
          else if (intent === '课程查询' || intent === '课程' || intent === '课表') {
            if (userType === 'student') {
              const studentInfo = await query('SELECT class_id FROM students WHERE student_id = ?', [userId]);

              if (studentInfo.length > 0) {
                queryResult = await query(`
                  SELECT
                    co.offering_id,
                    c.course_name,
                    c.course_code,
                    c.credits,
                    c.course_type,
                    t.name as teacher_name,
                    co.semester,
                    co.schedule,
                    co.classroom
                  FROM course_offerings co
                  LEFT JOIN courses c ON co.course_id = c.course_id
                  LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
                  WHERE co.class_id = ? AND co.status = 1
                  ORDER BY co.semester DESC
                `, [studentInfo[0].class_id]);
              }

              answer = JSON.stringify({
                success: true,
                type: 'courses',
                data: queryResult || [],
                message: `为您找到 ${queryResult?.length || 0} 门课程`
              });
            } else if (userType === 'teacher') {
              queryResult = await query(`
                SELECT
                  co.offering_id,
                  c.course_name,
                  c.course_code,
                  c.credits,
                  co.class_id,
                  cl.class_name,
                  co.semester,
                  co.schedule,
                  co.classroom,
                  co.current_students
                FROM course_offerings co
                LEFT JOIN courses c ON co.course_id = c.course_id
                LEFT JOIN classes cl ON co.class_id = cl.class_id
                WHERE co.teacher_id = ? AND co.status = 1
                ORDER BY co.semester DESC
              `, [userId]);

              answer = JSON.stringify({
                success: true,
                type: 'courses',
                data: queryResult,
                message: `为您找到 ${queryResult.length} 门授课课程`
              });
            }
          }
          // 查询管理办法
          else if (intent === '管理办法') {
            const keyword = message;

            queryResult = await query(`
              SELECT * FROM regulations
              WHERE status = '生效中'
              AND (title LIKE ? OR content LIKE ? OR category LIKE ?)
              ORDER BY effective_date DESC
              LIMIT 10
            `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

            if (queryResult.length > 0) {
              answer = JSON.stringify({
                success: true,
                type: 'regulations',
                data: queryResult,
                message: `为您找到 ${queryResult.length} 条相关管理办法`
              });
            } else {
              answer = '抱歉，没有找到相关的管理办法～';
            }
          }
        }
      }
    } catch (e) {
      console.log('AI返回的是普通文本回复，不是查询指令');
    }

    // ========== 步骤5：保存对话历史并返回 ==========
    await query(`
      INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userType, userId, message, answer, finalIntent, sessionId || null]);

    // 更新上下文
    contextService.updateContext(sessionId, message, answer);

    success(res, {
      answer,
      intent: finalIntent,
      queryResult: queryResult
    }, '查询成功');

  } catch (err) {
    console.error('AI对话错误:', err);
    error(res, '对话处理失败', 500);
  }
});

/**
 * 获取对话历史
 * GET /api/chat/history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // 限制最大100条

    console.log('📋 获取历史记录:', { userType, userId, limit });

    // 验证参数
    if (!userType || !userId) {
      console.error('❌ 用户信息不完整:', { userType, userId });
      return error(res, '用户信息不完整', 400);
    }

    // 验证limit值
    if (isNaN(limit) || limit < 1 || limit > 100) {
      console.error('❌ limit参数无效:', { limit, original: req.query.limit });
      return error(res, 'limit参数无效，必须是1-100之间的数字', 400);
    }

    // 直接查询 - 注意：LIMIT不能使用参数化查询，需要字符串拼接（已经验证了最大值）
    const history = await query(`
      SELECT chat_id, user_type, user_id, user_question,
             ai_answer,
             intent, session_id, created_at
      FROM chat_history
      WHERE user_type = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT ${limit}
    `, [userType, userId]);

    console.log('✅ 查询成功，返回', history.length, '条记录');

    // 在代码中截取预览
    const result = history.map(item => ({
      ...item,
      ai_answer_preview: item.ai_answer ? item.ai_answer.substring(0, 200) : ''
    }));

    success(res, result, '获取历史记录成功');

  } catch (err) {
    console.error('❌ 获取历史记录错误:', err);
    console.error('错误详情:', {
      code: err.code,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });

    // 提供更友好的错误信息
    let errorMessage = '获取历史记录失败';
    if (err.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = '对话历史表不存在，请联系管理员';
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = '数据库权限不足';
    }

    error(res, errorMessage, 500);
  }
});

module.exports = router;
