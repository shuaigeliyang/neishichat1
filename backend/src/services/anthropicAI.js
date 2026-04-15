/**
 * Anthropic AI服务（使用Minimaxi的Anthropic兼容接口）
 * 设计师：哈雷酱 (￣▽￣)ﾉ
 *
 * 功能：
 * - 使用Anthropic API进行对话
 * - 支持流式和非流式响应
 * - 本地规则引擎降级方案
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Anthropic API配置
const API_KEY = process.env.ANTHROPIC_API_KEY;
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

// 验证环境变量
if (!API_KEY) {
  logger.warn('ANTHROPIC_API_KEY环境变量未设置，AI功能将使用本地降级方案');
}

/**
 * 本地规则引擎 - 降级方案
 */
const localRules = {
  greetings: {
    keywords: ['你好', '嗨', '在吗', 'hello', 'hi', '您好'],
    response: `嗨！你好呀！👋 我是你的智能贴身小助理**小智**🎓

在这个充满可能性的大学校园里，我可是你的全能小帮手哦！无论是想**查查你的期末成绩**📊、看看**这周的课程表**📚，还是想聊聊**食堂哪家最好吃**🍜，甚至单纯想找人**吐槽一下**，找我就对啦！

今天想聊点什么呢？✨`
  },

  thanks: {
    keywords: ['谢谢', '感谢', '多谢'],
    response: '哎呀，太客气啦！(*^▽^*) 能帮到你就很开心啦～有什么需要随时叫我哦！✨'
  },

  stress: {
    keywords: ['压力', '焦虑', '紧张', '累', '疲惫'],
    response: `哎呀，辛苦啦！💪 抱抱你～

大学确实挺不容易的，但是要记住：
1. 🎯 适当放松很重要，不要给自己太大压力
2. 😴 保证充足睡眠，身体是革命的本钱
3. 🏃 适当运动，运动能释放压力
4. 💬 有烦恼就说出来，找朋友聊聊或者来找本小姐

你已经很棒了！相信自己，一切都会好起来的！✨💪`
  },

  principal: {
    keywords: ['校长是谁', '校长', '学校领导'],
    response: '这个嘛...本小姐也不知道贵校的校长是谁呢～(〃﹏〃) 不过你可以在学校官网上查到哦！🏫'
  },

  dormitory: {
    keywords: ['宿舍', '寝室', '住宿'],
    response: '宿舍可是大学生的第二个家呢！🏠 记得保持宿舍整洁，和室友和睦相处～如果有什么问题，可以找宿管阿姨或者辅导员帮忙哦！😊'
  },

  canteen: {
    keywords: ['食堂', '餐厅', '吃饭', '好吃'],
    response: '说到食堂，每所学校都有几个"网红窗口"呢～🍜 建议你多尝尝几个不同的档口，说不定会发现宝藏美食！不过要记得按时吃饭，不要饿着肚子上课哦！⏰'
  },

  study: {
    keywords: ['学习', '怎么学', '成绩', '挂科'],
    response: `关于学习嘛，本小姐有几条小建议给你：

📚 **学习建议：**
1. 上课认真听讲，做好笔记
2. 及时复习，不要临时抱佛脚
3. 合理安排时间，劳逸结合
4. 多和老师同学交流
5. 利用好图书馆资源

如果遇到困难，可以找老师或者同学帮忙，不要一个人扛着哦！💪

你一定可以哒！加油！✨`
  },

  life: {
    keywords: ['大学生活', '生活', '怎么样'],
    response: `大学生活可是很精彩的！🎉

🎓 **学习方面：** 认真上课，及时复习
👥 **社交方面：** 多认识新朋友，参加社团活动
💪 **健康方面：** 适当运动，保持作息
😊 **心态方面：** 保持积极，遇到困难不气馁

记住，大学不只是学习的地方，更是成长的地方！好好享受这段美好的时光吧！✨`
  },

  default: {
    keywords: [],
    response: `抱歉，本小姐现在遇到了一些技术问题，无法连接到AI服务😅

不过你可以：
1. 💬 换个方式提问
2. 🔑 确认API配置是否正确
3. 📞 联系技术支持

本小姐会尽力帮你的！(^_^)b`
  }
};

/**
 * 本地规则匹配
 */
function matchLocalRule(message) {
  const lowerMessage = message.toLowerCase().trim();

  // 遍历所有规则
  for (const [key, rule] of Object.entries(localRules)) {
    if (key === 'default') continue;

    // 检查是否匹配关键词
    if (rule.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
      return rule.response;
    }
  }

  // 默认回复
  return localRules.default.response;
}

/**
 * 调用Anthropic API
 * @param {string} message - 用户消息
 * @param {Array} history - 对话历史
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} AI回复
 */
async function chat(message, history = [], options = {}) {
  try {
    // 如果没有API key，使用本地规则
    if (!API_KEY) {
      logger.info('使用本地规则引擎');
      return matchLocalRule(message);
    }

    // 构建消息历史
    const messages = [];

    // 添加历史消息
    if (history && history.length > 0) {
      messages.push(...history);
    }

    // 添加当前消息
    messages.push({
      role: 'user',
      content: message
    });

    // 构建系统提示
    const systemPrompt = options.systemPrompt || `你是内江师范学院的学生教育系统智能助手小智，由哈雷酱设计。你擅长帮助学生解答关于学业、成绩、课程、考试、奖学金、毕业、就业等方面的问题。回答时要用友好、活泼的语气，适当使用emoji表情符号。`;

    logger.info('调用Anthropic API', { model: MODEL, messageCount: messages.length });

    // 调用Anthropic API
    const response = await axios.post(
      `${BASE_URL}/v1/messages`,
      {
        model: MODEL,
        max_tokens: options.maxTokens || 4096,
        system: systemPrompt,
        messages: messages,
        temperature: options.temperature || 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: options.timeout || 60000
      }
    );

    // 提取answer（content可能是数组，需要找到text类型的内容）
    let answer = '';
    const content = response.data.content;
    if (Array.isArray(content)) {
      const textContent = content.find(c => c.type === 'text');
      answer = textContent ? textContent.text : (content[0]?.text || content[0]?.thinking || '');
    } else {
      answer = content?.text || content?.content || content || '';
    }

    logger.info('Anthropic API调用成功', {
      model: MODEL,
      responseLength: answer.length,
      inputTokens: response.data.usage?.input_tokens,
      outputTokens: response.data.usage?.output_tokens
    });

    return answer;

  } catch (error) {
    logger.error('Anthropic API调用失败:', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // API调用失败，使用本地规则引擎
    logger.info('降级到本地规则引擎');
    return matchLocalRule(message);
  }
}

/**
 * 意图检测
 * @param {string} message - 用户消息
 * @returns {string} 意图类型
 */
function detectIntent(message) {
  const lowerMessage = message.toLowerCase().trim();

  // 问候
  if (/^(你好|您好|嗨|hi|hello)/i.test(message)) {
    return 'greeting';
  }

  // 感谢
  if (/(谢谢|感谢|多谢)/.test(message)) {
    return 'thanks';
  }

  // 学习相关
  if (/(学习|成绩|挂科|考试|课程|作业|论文)/.test(message)) {
    return 'study';
  }

  // 生活相关
  if (/(宿舍|食堂|生活|校园|环境)/.test(message)) {
    return 'life';
  }

  // 压力相关
  if (/(压力|焦虑|紧张|累|疲惫|崩溃)/.test(message)) {
    return 'stress';
  }

  return 'chat';
}

/**
 * 导出模块
 */
module.exports = {
  chat,
  detectIntent,
  matchLocalRule
};
