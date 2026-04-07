/**
 * 表单名称识别工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：从用户消息中识别表单名称
 */

const { query } = require('../config/database');

class FormNameRecognizer {
  /**
   * 从用户消息中识别表单名称
   * @param {String} message - 用户消息
   * @returns {Object} { recognized: boolean, templateName: string, confidence: number }
   */
  async recognizeFormName(message) {
    try {
      console.log('🔍 [识别表单] 原始输入:', message);

      // 1. 获取所有表单模板
      const templates = await query(`
        SELECT template_id, template_name, project_name, category
        FROM form_templates
        WHERE status = 1
      `);

      console.log('📊 [识别表单] 数据库表单数:', templates.length);

      if (templates.length === 0) {
        return {
          recognized: false,
          reason: '没有可用的表单模板'
        };
      }

      // 2. 清理用户消息
      const cleanedMessage = this.cleanMessage(message);
      console.log('📝 [识别表单] 清理后:', cleanedMessage);

      // 3. 尝试精确匹配
      let bestMatch = null;
      let bestScore = 0;

      console.log('🎯 [识别表单] 开始匹配...');
      for (const template of templates) {
        const score = this.calculateMatchScore(cleanedMessage, template.template_name);

        if (score > 0) {
          console.log(`   "${template.template_name.substring(0, 30)}..." → ${score.toFixed(2)}分`);
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = template;
        }
      }

      // 4. 判断是否匹配成功
      const THRESHOLD = 0.3; // 相似度阈值

      console.log(`🏆 [识别表单] 最佳匹配: "${bestMatch?.template_name}" (${bestScore.toFixed(2)}分)`);

      if (bestMatch && bestScore >= THRESHOLD) {
        console.log('✅ [识别表单] 成功!');

        return {
          recognized: true,
          templateName: bestMatch.template_name,
          templateId: bestMatch.template_id,
          confidence: bestScore,
          project: bestMatch.project_name,
          category: bestMatch.category
        };
      } else {
        console.log('❌ [识别表单] 失败! 分数低于阈值 0.3');

        return {
          recognized: false,
          reason: '无法识别表单名称',
          bestMatch: bestMatch ? bestMatch.template_name : null,
          bestScore: bestScore
        };
      }

    } catch (error) {
      console.error('❌ [识别表单] 异常:', error);
      return {
        recognized: false,
        reason: '识别过程出错'
      };
    }
  }

  /**
   * 清理用户消息
   * @param {String} message - 原始消息
   * @returns {String} 清理后的消息
   */
  cleanMessage(message) {
    // 只移除动作词，保留表单类型关键词
    const actions = ['下载', '生成', '我要', '需要', '想要', '获取', '表单'];
    let cleaned = message;

    actions.forEach(action => {
      cleaned = cleaned.replace(new RegExp(action, 'g'), '');
    });

    // 移除特殊字符
    cleaned = cleaned.replace(/[！!？?。.,，]/g, '');

    // 去除空格
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * 计算匹配分数
   * @param {String} message - 用户消息
   * @param {String} templateName - 表单模板名称
   * @returns {Number} 匹配分数（0-1）
   */
  calculateMatchScore(message, templateName) {
    let score = 0;

    // 优先级1：完全匹配（1.0分）
    if (message === templateName) {
      return 1.0;
    }

    // 优先级2：清理后完全匹配（0.95分）
    // 处理用户输入完整的表单名称（只是多了"下载"等前缀）
    const cleaned = message.replace(/^(下载|生成|我要|需要|想要|获取)/, '').trim();
    if (cleaned === templateName) {
      return 0.95;
    }

    // 优先级3：包含匹配（0.9分）
    // 表单名包含用户输入，或用户输入包含表单名
    if (templateName.includes(message) || message.includes(templateName)) {
      score = 0.9;
    }
    // 清理后的包含匹配
    else if (templateName.includes(cleaned) || cleaned.includes(templateName)) {
      score = 0.85;
    }

    // 优先级4：关键词匹配（0.35分/关键词）
    const keywords = ['申请表', '审批表', '考核表', '汇总表', '认定表', '规划表', '标准表', '协议书', '同意书', '备案表'];
    for (const kw of keywords) {
      if (message.includes(kw) && templateName.includes(kw)) {
        score += 0.35;
      }
    }

    // 优先级5：部分匹配（开头部分）
    if (message.length >= 4 && templateName.includes(message.substring(0, 4))) {
      score = Math.max(score, 0.5);
    }

    return score;
  }

  /**
   * 分词
   * @param {String} text - 文本
   * @returns {Array} 词数组
   */
  splitWords(text) {
    // 按常见关键词分割
    const keywords = ['申请表', '审批表', '考核表', '汇总表', '认定表', '规划表', '标准表', '协议书', '同意书', '备案表', '内江师范学院', '学生', '素质活动', '德育实践', '补修', '认定', '项目'];

    let words = [text];

    keywords.forEach(keyword => {
      const newWords = [];
      words.forEach(word => {
        const parts = word.split(keyword);
        if (parts.length > 1) {
          parts.forEach((part, index) => {
            if (part) newWords.push(part);
            if (index < parts.length - 1) newWords.push(keyword);
          });
        } else {
          newWords.push(word);
        }
      });
      words = newWords;
    });

    return words.filter(w => w.length >= 2);
  }

  /**
   * 获取相似表单建议
   * @param {String} message - 用户消息
   * @param {Number} limit - 返回数量
   * @returns {Array} 相似表单列表
   */
  async getSimilarForms(message, limit = 5) {
    try {
      const templates = await query(`
        SELECT template_name, project_name, category
        FROM form_templates
        WHERE status = 1
        ORDER BY sort_order ASC
      `);

      const scored = templates.map(template => ({
        ...template,
        score: this.calculateMatchScore(this.cleanMessage(message), template.template_name)
      }));

      // 过滤并排序
      const similar = scored
        .filter(t => t.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return similar;

    } catch (error) {
      console.error('❌ 获取相似表单失败:', error);
      return [];
    }
  }
}

module.exports = new FormNameRecognizer();
