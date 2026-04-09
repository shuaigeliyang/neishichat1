/**
 * 文本清理服务 - 用于清理RAG返回的文档内容
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：
 * - 删除偶数行（噪音标点符号行）
 * - 标准化标点符号
 * - 清理多余空格
 * - 修正换行问题
 * - 段落重组
 */

class TextCleaner {
  constructor() {
    // 孤立标点符号列表（单独成行的标点）
    this.isolatedPunctuation = /^[。，、；：,.;:!?！？，,、\s]+$/;

    // 需要标准化的标点映射
    this.punctuationMap = {
      ',': '，',
      ';': '；',
      ':': '：',
      '\\.': '。',
      '\\?': '？',
      '!': '！',
      '\\(': '（',
      '\\)': '）'
    };
  }

  /**
   * 主清理方法 - 清理文本内容
   * @param {string} text - 原始文本
   * @returns {string} 清理后的文本
   */
  clean(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let cleaned = text;

    // ✨ 新方法：删除偶数行（噪音标点符号行）
    cleaned = this.removeEvenLines(cleaned);

    // 其他清理规则
    cleaned = this.normalizeLineBreaks(cleaned);
    cleaned = this.normalizePunctuation(cleaned);
    cleaned = this.removeExtraSpaces(cleaned);
    cleaned = this.removeDuplicatePunctuation(cleaned);
    cleaned = this.removeEmptyLines(cleaned);

    return cleaned;
  }

  /**
   * ✨ 新方法：删除偶数行
   * 针对学生手册PDF提取产生的规律：偶数行都是噪音标点符号
   */
  removeEvenLines(text) {
    const lines = text.split('\n');

    // 只保留奇数行（索引为偶数的行，因为从0开始）
    const oddLines = lines.filter((_, index) => index % 2 === 0);

    return oddLines.join('\n');
  }

  /**
   * 移除孤立的标点符号行
   * 例如：单独一行的"。", ", "
   */
  removeIsolatedPunctuation(text) {
    return text
      .split('\n')
      .filter(line => !this.isolatedPunctuation.test(line.trim()))
      .join('\n');
  }

  /**
   * 标准化换行符
   */
  normalizeLineBreaks(text) {
    // 统一换行符为\n
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * 标准化标点符号
   * 将英文标点转换为中文标点
   */
  normalizePunctuation(text) {
    let normalized = text;

    // 应用标点映射
    for (const [from, to] of Object.entries(this.punctuationMap)) {
      const regex = new RegExp(from, 'g');
      normalized = normalized.replace(regex, to);
    }

    return normalized;
  }

  /**
   * 移除多余空格
   */
  removeExtraSpaces(text) {
    let cleaned = text;

    // 移除标点符号前后的空格（中文标点不需要空格）
    cleaned = cleaned.replace(/\s+([，。；：！？、（）])/g, '$1');
    cleaned = cleaned.replace(/([，。；：！？、（）])\s+/g, '$1');

    // 移除行首行尾空格
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

    // 压缩多个空格为单个空格
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    return cleaned;
  }

  /**
   * 清理重复的标点符号
   * 例如："，，，" -> "，"，"。。。" -> "。"
   */
  removeDuplicatePunctuation(text) {
    let cleaned = text;

    // 移除重复的中文标点符号
    const punctuationList = ['，。；：！？、'];
    punctuationList.forEach(punct => {
      const regex = new RegExp(`\\${punct}{2,}`, 'g');
      cleaned = cleaned.replace(regex, punct);
    });

    // 修复标点符号组合问题
    cleaned = cleaned.replace(/[，。；：！？、]+[，。；：！？、]+/g, (match) => {
      // 如果是多个标点符号组合，保留最后一个
      return match.slice(-1);
    });

    // 修复括号内的标点问题：（、）、（，）、（。） -> （）
    cleaned = cleaned.replace(/\（[、。，]+\）/g, '（');

    return cleaned;
  }

  /**
   * 移除多余的空行（保留段落间的一个空行）
   */
  removeEmptyLines(text) {
    // 压缩多个连续空行为单个空行
    return text.replace(/\n{3,}/g, '\n\n');
  }

  /**
   * 高级清理 - 针对特定格式的文档
   * @param {string} text - 原始文本
   * @returns {string} 深度清理后的文本
   */
  deepClean(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let cleaned = text;

    // 先进行基础清理
    cleaned = this.clean(cleaned);

    return cleaned;
  }
}

// 导出单例
module.exports = new TextCleaner();
