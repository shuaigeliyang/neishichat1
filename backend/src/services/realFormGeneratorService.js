/**
 * 真实表单生成服务（基于真实Word文档）
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 * 功能：从真实Word文档模板生成表单，并自动填充学生信息
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const docxParser = require('./docxParserService');

class RealFormGeneratorService {
  /**
   * 生成表单（主入口）
   * @param {String} templateId - 模板ID或模板名称
   * @param {Object} studentInfo - 学生信息
   * @param {String} userType - 用户类型
   * @returns {Promise<Object>} 生成结果
   */
  async generateForm(templateId, studentInfo, userType = 'student') {
    try {
      console.log('📝 开始生成表单', { templateId, userType });

      // 1. 查询模板信息
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('表单模板不存在');
      }

      console.log('✅ 找到模板:', template.template_name);

      // 2. 检查模板文件是否存在
      const templatePath = this.resolveTemplatePath(template.file_path);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`模板文件不存在: ${templatePath}`);
      }

      console.log('✅ 模板文件存在:', templatePath);

      // 3. 解析模板文档
      const docInfo = await docxParser.parseDocument(templatePath);
      console.log('✅ 文档解析完成');

      // 4. 如果启用了自动填充，填充学生信息
      let finalFilePath = templatePath;
      if (template.auto_fill_enabled && userType === 'student') {
        console.log('✅ 启用自动填充');
        // TODO: 实现自动填充逻辑
        // 目前先返回原始模板文件
        console.log('⚠️  自动填充功能开发中，当前返回原始模板');
      }

      // 5. 生成输出文件名
      const fileName = this.generateFileName(template, studentInfo);
      const outputPath = this.generateOutputPath(fileName);

      console.log('📁 输出路径:', outputPath);

      // 6. 复制模板文件到输出目录
      fs.copyFileSync(templatePath, outputPath);

      console.log('✅ 表单生成成功:', fileName);
      console.log('✅ 文件大小:', (fs.statSync(outputPath).size / 1024).toFixed(2), 'KB');

      return {
        downloadUrl: `/api/forms/download/${fileName}`,
        fileName: fileName,
        templateName: template.template_name,
        filePath: outputPath,
        fileSize: fs.statSync(outputPath).size
      };

    } catch (error) {
      console.error('❌ 生成表单失败:', error);
      throw error;
    }
  }

  /**
   * 获取模板信息
   * @param {String} templateId - 模板ID或名称
   * @returns {Promise<Object>} 模板信息
   */
  async getTemplate(templateId) {
    try {
      let template;

      // 如果是数字，按ID查询
      if (/^\d+$/.test(templateId)) {
        const results = await query(`
          SELECT * FROM form_templates
          WHERE template_id = ? AND status = 1
        `, [parseInt(templateId)]);
        template = results[0];
      } else {
        // 按名称模糊查询
        const results = await query(`
          SELECT * FROM form_templates
          WHERE template_name LIKE ? AND status = 1
          LIMIT 1
        `, [`%${templateId}%`]);
        template = results[0];
      }

      return template;

    } catch (error) {
      console.error('查询模板失败:', error);
      return null;
    }
  }

  /**
   * 解析模板文件路径
   * @param {String} relativePath - 数据库中的相对路径
   * @returns {String} 绝对路径
   */
  resolveTemplatePath(relativePath) {
    // 数据库中的路径格式: ../内江师范学院相关信息附件/项目名/文件名.docx
    // 需要转换为项目根目录的绝对路径
    const projectRoot = path.resolve(__dirname, '../../..');
    return path.join(projectRoot, relativePath.replace('../', ''));
  }

  /**
   * 生成输出文件名
   * @param {Object} template - 模板信息
   * @param {Object} studentInfo - 学生信息
   * @returns {String} 文件名
   */
  generateFileName(template, studentInfo) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const studentName = studentInfo.name || '示例学生';
    const baseName = path.basename(template.file_path, '.docx');

    // 格式: 表单名_学生姓名_时间戳.docx
    return `${baseName}_${studentName}_${timestamp}.docx`;
  }

  /**
   * 生成输出路径
   * @param {String} fileName - 文件名
   * @returns {String} 输出路径
   */
  generateOutputPath(fileName) {
    // 修正路径：确保在 backend/exports/forms 下
    const outputDir = path.resolve(__dirname, '../../exports/forms');

    console.log('📂 __dirname:', __dirname);
    console.log('📂 outputDir:', outputDir);

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fullPath = path.join(outputDir, fileName);
    console.log('📄 完整路径:', fullPath);

    return fullPath;
  }

  /**
   * 获取所有可用模板列表
   * @param {String} userType - 用户类型
   * @returns {Promise<Array>} 模板列表
   */
  async getTemplateList(userType = 'student') {
    try {
      let whereClause = 'WHERE status = 1';
      const params = [];

      // 根据用户类型筛选
      if (userType === 'student') {
        whereClause += ' AND target_audience IN (?, ?)';
        params.push('全体学生', '全体用户');
      } else if (userType === 'teacher') {
        whereClause += ' AND target_audience IN (?, ?, ?)';
        params.push('全体学生', '全体教师', '全体用户');
      }
      // 管理员可以看到所有

      const templates = await query(`
        SELECT
          template_id,
          template_name,
          category,
          project_name,
          description,
          file_type,
          table_count,
          form_type,
          target_audience,
          auto_fill_enabled,
          download_count,
          sort_order
        FROM form_templates
        ${whereClause}
        ORDER BY sort_order ASC, template_id ASC
      `, params);

      return templates;

    } catch (error) {
      console.error('获取模板列表失败:', error);
      return [];
    }
  }

  /**
   * 按项目分组获取模板
   * @param {String} userType - 用户类型
   * @returns {Promise<Object>} 按项目分组的模板
   */
  async getTemplatesByProject(userType = 'student') {
    const templates = await this.getTemplateList(userType);

    const grouped = {};
    templates.forEach(template => {
      const project = template.project_name;
      if (!grouped[project]) {
        grouped[project] = [];
      }
      grouped[project].push(template);
    });

    return grouped;
  }

  /**
   * 搜索模板
   * @param {String} keyword - 搜索关键词
   * @param {String} userType - 用户类型
   * @returns {Promise<Array>} 搜索结果
   */
  async searchTemplates(keyword, userType = 'student') {
    try {
      let whereClause = 'WHERE status = 1 AND (template_name LIKE ? OR description LIKE ? OR project_name LIKE ?)';
      const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

      // 根据用户类型筛选
      if (userType === 'student') {
        whereClause += ' AND target_audience IN (?, ?)';
        params.push('全体学生', '全体用户');
      } else if (userType === 'teacher') {
        whereClause += ' AND target_audience IN (?, ?, ?)';
        params.push('全体学生', '全体教师', '全体用户');
      }

      const templates = await query(`
        SELECT
          template_id,
          template_name,
          category,
          project_name,
          description,
          form_type,
          sort_order
        FROM form_templates
        ${whereClause}
        ORDER BY sort_order ASC, template_id ASC
      `, params);

      return templates;

    } catch (error) {
      console.error('搜索模板失败:', error);
      return [];
    }
  }
}

module.exports = new RealFormGeneratorService();
