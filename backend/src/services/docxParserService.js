/**
 * Word文档解析服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：读取并解析Word文档，提取表格结构和文本内容
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

class DocxParserService {
  /**
   * 解析Word文档，提取所有信息
   * @param {String} filePath - Word文档路径
   * @returns {Promise<Object>} 文档信息
   */
  async parseDocument(filePath) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      // 使用mammoth提取文本内容
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;

      // 提取文档信息
      const documentInfo = {
        filePath: filePath,
        fileName: path.basename(filePath),
        text: text,
        paragraphs: this.extractParagraphs(text),
        tables: await this.extractTables(filePath),
        formFields: this.extractFormFields(text)
      };

      return documentInfo;

    } catch (error) {
      console.error(`解析文档失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 提取段落（按行分割）
   * @param {String} text - 文本内容
   * @returns {Array} 段落数组
   */
  extractParagraphs(text) {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * 提取表格信息（简化版）
   * @param {String} filePath - 文档路径
   * @returns {Promise<Array>} 表格信息数组
   */
  async extractTables(filePath) {
    try {
      const JSZip = require('jszip');
      const data = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(data);

      // 读取document.xml
      const documentXml = await zip.file('word/document.xml').async('string');

      // 统计表格数量
      const tableMatches = documentXml.match(/<w:tbl>/g);
      const tableCount = tableMatches ? tableMatches.length : 0;

      // 提取表格基本信息
      const tables = [];
      for (let i = 0; i < tableCount; i++) {
        tables.push({
          index: i,
          tableNumber: i + 1,
          hasTable: true
        });
      }

      return tables;

    } catch (error) {
      console.error(`提取表格失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 提取表单字段（从文本中识别字段名）
   * @param {String} text - 文本内容
   * @returns {Array} 字段数组
   */
  extractFormFields(text) {
    const commonFields = [
      '姓名', '学号', '性别', '出生年月', '民族', '籍贯',
      '学院', '专业', '班级', '联系电话', '手机', '邮箱',
      '身份证号', '家庭住址', '家长姓名', '家长电话',
      '申请理由', '个人简历', '学习成绩', '获奖情况',
      '辅导员意见', '学院意见', '教务处意见', '签字', '日期'
    ];

    const foundFields = [];

    commonFields.forEach(field => {
      if (text.includes(field)) {
        foundFields.push({
          fieldName: field,
          fieldType: this.guessFieldType(field),
          required: this.isFieldRequired(field),
          autoFill: this.canAutoFill(field)
        });
      }
    });

    return foundFields;
  }

  /**
   * 猜测字段类型
   * @param {String} fieldName - 字段名
   * @returns {String} 字段类型
   */
  guessFieldType(fieldName) {
    const numberFields = ['学号', '手机', '电话', '身份证号', '年龄'];
    const dateFields = ['出生年月', '日期', '时间'];
    const textareaFields = ['申请理由', '个人简历', '获奖情况', '意见'];

    if (numberFields.some(f => fieldName.includes(f))) {
      return 'text'; // 学号等虽然看起来像数字，但应该用文本
    }
    if (dateFields.some(f => fieldName.includes(f))) {
      return 'date';
    }
    if (textareaFields.some(f => fieldName.includes(f))) {
      return 'textarea';
    }

    return 'text';
  }

  /**
   * 判断字段是否必填
   * @param {String} fieldName - 字段名
   * @returns {Boolean} 是否必填
   */
  isFieldRequired(fieldName) {
    const requiredFields = ['姓名', '学号', '性别', '学院', '专业', '班级'];
    return requiredFields.includes(fieldName);
  }

  /**
   * 判断字段是否可以自动填充
   * @param {String} fieldName - 字段名
   * @returns {Boolean} 是否可自动填充
   */
  canAutoFill(fieldName) {
    const autoFillFields = [
      '姓名', '学号', '性别', '学院', '专业', '班级',
      '联系电话', '身份证号', '家庭住址'
    ];
    return autoFillFields.includes(fieldName);
  }

  /**
   * 批量解析文档
   * @param {Array} filePaths - 文档路径数组
   * @returns {Promise<Array>} 解析结果数组
   */
  async parseDocuments(filePaths) {
    const results = [];

    for (const filePath of filePaths) {
      try {
        const info = await this.parseDocument(filePath);
        results.push(info);
      } catch (error) {
        console.error(`解析失败: ${filePath}`, error.message);
        results.push({
          filePath: filePath,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 从文档中提取表单模板信息
   * @param {String} filePath - 文档路径
   * @returns {Promise<Object>} 表单模板信息
   */
  async extractFormTemplate(filePath) {
    const docInfo = await this.parseDocument(filePath);

    return {
      fileName: docInfo.fileName,
      filePath: docInfo.filePath,
      tableCount: docInfo.tables.length,
      fields: docInfo.formFields,
      preview: docInfo.text.substring(0, 200)
    };
  }
}

module.exports = new DocxParserService();
