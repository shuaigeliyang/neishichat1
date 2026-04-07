/**
 * 表单下载路由（基于真实文档版本）
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：表单列表、生成、下载
 * 更新时间：2026-04-03
 * 说明：已迁移到基于真实Word文档的表单生成方式
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');
const realFormGenerator = require('../services/realFormGeneratorService');
const path = require('path');

/**
 * GET /api/forms - 根路由，重定向到列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // 重定向到列表接口
    const { type: userType } = req.user;
    const { category } = req.query;

    // 构建查询条件
    let whereClause = 'WHERE status = 1';
    const params = [];

    // 根据用户类型筛选
    if (userType === 'student') {
      whereClause += ' AND target_audience IN (?, ?)';
      params.push('全体学生', '全体用户');
    } else if (userType === 'teacher') {
      whereClause += ' AND target_audience IN (?, ?, ?)';
      params.push('全体学生', '全体教师', '全体用户');
    } else if (userType === 'admin') {
      // 管理员可以看到所有
    }

    // 按分类筛选
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    const forms = await query(`
      SELECT
        template_id,
        template_name,
        category,
        project_name,
        description,
        file_type,
        download_count,
        target_audience
      FROM form_templates
      ${whereClause}
      ORDER BY project_name ASC, sort_order ASC, template_id ASC
    `, params);

    console.log('✅ 获取表单列表成功', { count: forms.length });
    success(res, forms, '获取表单列表成功');

  } catch (err) {
    console.error('❌ 获取表单列表失败:', err);
    error(res, '获取表单列表失败', 500);
  }
});

/**
 * 获取可下载的表单列表
 * GET /api/forms/list
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const { type: userType } = req.user;
    const { category } = req.query;

    console.log('📋 获取表单列表', { userType, category });

    // 构建查询条件
    let whereClause = 'WHERE status = 1';
    const params = [];

    // 根据用户类型筛选
    if (userType === 'student') {
      whereClause += ' AND target_audience IN (?, ?)';
      params.push('全体学生', '全体用户');
    } else if (userType === 'teacher') {
      whereClause += ' AND target_audience IN (?, ?, ?)';
      params.push('全体学生', '全体教师', '全体用户');
    } else if (userType === 'admin') {
      // 管理员可以看到所有
    }

    // 按分类筛选
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    const forms = await query(`
      SELECT
        template_id,
        template_name,
        category,
        project_name,
        description,
        file_type,
        download_count,
        target_audience
      FROM form_templates
      ${whereClause}
      ORDER BY project_name ASC, sort_order ASC, template_id ASC
    `, params);

    console.log('✅ 获取表单列表成功', { count: forms.length });
    success(res, forms, '获取表单列表成功');

  } catch (err) {
    console.error('❌ 获取表单列表失败:', err);
    error(res, '获取表单列表失败', 500);
  }
});

/**
 * 生成并下载表单（基于真实文档模板）
 * POST /api/forms/generate
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;
    let { templateId, templateName } = req.body;

    console.log('📝 生成表单（基于真实文档）', { userId, userType, templateId, templateName });

    // ========== 智能表单名称匹配（新增！）==========
    if (!templateId && templateName) {
      console.log('🔍 智能匹配表单名称:', templateName);

      // 查询所有表单模板
      const allTemplates = await query(`
        SELECT template_id, template_name, project_name
        FROM form_templates
        WHERE status = 1
      `);

      // 智能匹配 - 优先级从高到低
      let bestMatch = null;
      let bestScore = 0;

      for (const template of allTemplates) {
        let score = 0;
        const tn = template.template_name;
        const input = templateName.trim();

        // 优先级1：完全匹配（用户输入完整表单名）
        if (input === tn) {
          score = 1.0;
          console.log(`   ✅ 完全匹配: "${tn}"`);
        }
        // 优先级2：包含匹配（用户输入包含完整表单名或反之）
        else if (tn.includes(input) || input.includes(tn)) {
          score = 0.95;
          console.log(`   ✅ 包含匹配: "${tn}"`);
        }
        // 优先级3：清理后匹配（移除常见动作词）
        else {
          const actions = ['下载', '生成', '我要', '需要', '想要', '获取', '表单'];
          let cleaned = input;
          actions.forEach(action => {
            cleaned = cleaned.replace(new RegExp(action, 'g'), '');
          });
          cleaned = cleaned.replace(/[！!？?。.,，]/g, '').trim();

          console.log(`   📝 清理后: "${cleaned}"`);

          // 清理后完全匹配
          if (cleaned === tn) {
            score = 0.9;
          }
          // 清理后包含匹配
          else if (tn.includes(cleaned)) {
            score = 0.85;
          }
          // 关键词匹配
          else if (cleaned.length >= 2) {
            const keywords = ['申请表', '审批表', '考核表', '汇总表', '认定表', '规划表', '标准表', '协议书', '同意书', '备案表'];
            for (const kw of keywords) {
              if (cleaned.includes(kw) && tn.includes(kw)) {
                score += 0.35;
              }
            }
            // 检查开头部分匹配
            if (cleaned.length >= 4 && tn.includes(cleaned.substring(0, 4))) {
              score = Math.max(score, 0.5);
            }
          }

          if (score > 0) {
            console.log(`   ⚠️  关键词匹配: "${tn}" - 分数: ${score.toFixed(2)}`);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = template;
        }
      }

      // 判断是否匹配成功
      const THRESHOLD = 0.3;

      if (bestMatch && bestScore >= THRESHOLD) {
        console.log('✅ 智能匹配成功:', {
          原始: templateName,
          匹配: bestMatch.template_name,
          分数: bestScore.toFixed(2)
        });
        templateId = bestMatch.template_id;
        templateName = bestMatch.template_name;
      } else {
        console.log('❌ 匹配失败，最高分:', bestScore.toFixed(2));

        // 返回相似建议
        const suggestions = allTemplates
          .map(t => ({
            template_name: t.template_name,
            project: t.project_name,
            score: t.template_name.includes(cleaned) || cleaned.includes(t.template_name.substring(0, 5)) ? 0.5 : 0
          }))
          .filter(t => t.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        let suggestionText = '\n\n💡 **您是不是想要下载以下表单？**\n\n';
        if (suggestions.length > 0) {
          suggestionText += suggestions.map((s, i) =>
            `${i + 1}. **${s.template_name}**\n   （${s.project}）`
          ).join('\n\n');
        } else {
          suggestionText += '\n\n您可以尝试说：\n- "下载转专业申请表"\n- "生成奖学金申请表"\n- "获取竞赛申请表"';
        }

        return error(res, `抱歉，我没有识别到您要生成的表单名称。${suggestionText}`, 400);
      }
    }

    // 获取学生信息
    let studentInfo = null;

    if (userType === 'student') {
      const students = await query(`
        SELECT
          s.*,
          c.class_name,
          m.major_name,
          col.college_name
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.class_id
        LEFT JOIN majors m ON c.major_id = m.major_id
        LEFT JOIN colleges col ON m.college_id = col.college_id
        WHERE s.student_id = ?
      `, [userId]);

      if (students.length === 0) {
        return error(res, '学生信息不存在', 404);
      }
      studentInfo = students[0];
    } else {
      // 管理员和教师生成表单时，使用示例学生信息
      console.log('⚠️ 管理员/教师生成表单，使用示例信息');
      studentInfo = {
        name: '示例学生',
        student_code: '20240001',
        gender: '男',
        class_name: '示例班级',
        major_name: '示例专业',
        college_name: '示例学院',
        phone: '13800138000',
        email: 'example@edu.cn'
      };
    }

    // 使用新的真实表单生成服务
    const identifier = templateId || templateName;
    const result = await realFormGenerator.generateForm(identifier, studentInfo, userType);

    // 更新下载次数（使用返回的templateId）
    if (result.templateId) {
      await query(`
        UPDATE form_templates
        SET download_count = download_count + 1
        WHERE template_id = ?
      `, [result.templateId]);
    }

    console.log('✅ 表单生成成功', { fileName: result.fileName });

    const message = userType === 'student'
      ? '✅ 表单生成成功，已使用真实文档模板'
      : '✅ 表单生成成功（管理员模式）';

    success(res, {
      downloadUrl: result.downloadUrl,
      fileName: result.fileName,
      templateName: result.templateName,
      message: message,
      fileSize: result.fileSize
    }, '表单生成成功');

  } catch (err) {
    console.error('❌ 生成表单失败:', err);
    error(res, '生成表单失败：' + err.message, 500);
  }
});

/**
 * 下载生成的表单文件
 * GET /api/forms/download/:fileName
 */
router.get('/download/:fileName', authenticate, async (req, res) => {
  try {
    const { fileName } = req.params;
	  const filePath = path.resolve(__dirname, '../../exports/forms', fileName);

    console.log('📥 下载表单', { fileName });

	  console.log('📂 __dirname:', __dirname);	  console.log('📄 文件路径:', filePath);
    // 检查文件是否存在
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      console.error('❌ 文件不存在', { filePath });
      return error(res, '文件不存在', 404);
	    const exportsDir = path.resolve(__dirname, '../../exports/forms');	    console.error('❌ exports目录存在:', fs.existsSync(exportsDir));	    console.error('❌ 目录内容:', fs.readdirSync(exportsDir));
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // 发送文件
    res.sendFile(filePath);

    console.log('✅ 表单下载成功', { fileName });

  } catch (err) {
    console.error('❌ 下载表单失败:', err);
    error(res, '下载表单失败', 500);
  }
});

/**
 * 按项目分组获取表单列表
 * GET /api/forms/by-project
 */
router.get('/by-project', authenticate, async (req, res) => {
  try {
    const { type: userType } = req.user;

    console.log('📋 获取表单列表（按项目分组）', { userType });

    const groupedTemplates = await realFormGenerator.getTemplatesByProject(userType);

    console.log('✅ 获取表单列表成功', { projectCount: Object.keys(groupedTemplates).length });
    success(res, groupedTemplates, '获取表单列表成功');

  } catch (err) {
    console.error('❌ 获取表单列表失败:', err);
    error(res, '获取表单列表失败', 500);
  }
});

/**
 * 搜索表单
 * GET /api/forms/search
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { type: userType } = req.user;
    const { keyword } = req.query;

    if (!keyword) {
      return error(res, '请提供搜索关键词', 400);
    }

    console.log('🔍 搜索表单', { userType, keyword });

    const results = await realFormGenerator.searchTemplates(keyword, userType);

    console.log('✅ 搜索完成', { resultCount: results.length });
    success(res, results, '搜索完成');

  } catch (err) {
    console.error('❌ 搜索表单失败:', err);
    error(res, '搜索表单失败', 500);
  }
});

module.exports = router;
