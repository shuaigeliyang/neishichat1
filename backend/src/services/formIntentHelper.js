/**
 * 表单意图识别增强
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：在chat路由中添加表单下载意图识别
 */

const formNameRecognizer = require('../services/formNameRecognizer');

/**
 * 检查是否为表单下载请求
 * @param {String} message - 用户消息
 * @returns {Object} { isFormRequest: boolean, formInfo: Object }
 */
async function checkFormDownloadIntent(message) {
  try {
    // 1. 检查是否包含表单相关关键词
    const formKeywords = ['下载', '生成', '申请表', '审批表', '表单'];
    const hasFormKeyword = formKeywords.some(keyword => message.includes(keyword));

    if (!hasFormKeyword) {
      return { isFormRequest: false };
    }

    // 2. 识别表单名称
    const recognition = await formNameRecognizer.recognizeFormName(message);

    if (recognition.recognized) {
      return {
        isFormRequest: true,
        formInfo: recognition
      };
    } else {
      // 3. 如果识别失败，返回相似表单建议
      const similarForms = await formNameRecognizer.getSimilarForms(message, 3);

      return {
        isFormRequest: true,
        recognized: false,
        reason: recognition.reason,
        similarForms: similarForms
      };
    }

  } catch (error) {
    console.error('❌ 表单意图检查失败:', error);
    return { isFormRequest: false };
  }
}

module.exports = { checkFormDownloadIntent };
