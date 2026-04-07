/**
 * 智谱AI服务 - 完全修复版本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 修复内容：
 * 1. 使用正确的API端点（参考降重项目）
 * 2. 使用正确的模型：glm-4-flash
 * 3. 简化API调用逻辑
 */

const axios = require('axios');
const logger = require('../utils/logger');

// 智谱AI配置（与降重项目一致）
const API_KEY = process.env.ZHIPU_API_KEY;
const API_BASE = process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';

// 验证环境变量
if (!API_KEY) {
  logger.warn('ZHIPU_API_KEY环境变量未设置，AI功能将使用本地降级方案');
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
    response: '哎呀，太客气啦！(*/ω\\*) 能帮到你就很开心啦～有什么需要随时叫我哦！✨'
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

不过你可以试着问：
- 📊 "我的信息"、"查询成绩"、"我的课程"
- 💬 "你好"、"最近压力大"、"大学生活怎么样"
- 📥 "下载个人信息"、"导出成绩单"

或者稍后再试试，也许本小姐就恢复啦！如果问题持续，请联系管理员哦！🔧`
  }
};

/**
 * 本地规则匹配
 */
function matchLocalRule(message) {
  for (const [key, rule] of Object.entries(localRules)) {
    if (key === 'default') continue;
    if (rule.keywords.some(keyword => message.includes(keyword))) {
      return rule.response;
    }
  }
  return localRules.default.response;
}

/**
 * 调用智谱AI API（增强版：支持对话历史）
 * @param {string} message - 用户消息
 * @param {Array} conversationHistory - 对话历史（新增！）
 * @param {Object} options - 额外选项
 * @returns {Promise<Object>}
 */
async function chat(message, conversationHistory = [], options = {}) {
  try {
    // 检查API Key
    if (!API_KEY) {
      logger.warn('未配置API Key，使用本地降级方案');
      const localResponse = matchLocalRule(message);
      return {
        success: true,
        answer: localResponse,
        usage: null,
        isLocal: true
      };
    }

    logger.info('调用智谱AI', {
      message: message.substring(0, 50),
      historyLength: conversationHistory.length
    });

    // 系统提示词（增强版：添加对话记忆说明）
    const systemPrompt = `你是一位智能、友好、幽默的学生教育系统助手，名叫"小智"。你的性格特点是：

1. **自然对话**：像一个真实的朋友一样和学生聊天，不是冷冰冰的查询机器
2. **幽默风趣**：适当使用表情符号和轻松的语气，让对话更有趣
3. **智能识别**：能准确判断用户是想闲聊还是查询数据
4. **知识广泛**：除了学生的个人数据，你也能回答关于大学生活的各类问题
5. **对话记忆**：你能记住之前的对话内容，理解用户的追问和代词引用

## 对话记忆功能（重要！）

你现在具有对话记忆功能，可以记住之前说过的话。请根据对话历史理解用户的追问和引用。

### 追问场景示例：
- 用户："转专业需要什么条件？"
- 你："根据第三章第六条规定，需要符合以下条件..."
- 用户："那具体怎么申请？" → 你应该理解用户在问转专业的申请流程

### 代词引用示例：
- 用户："重修需要什么条件？"
- 你："重修需要..."
- 用户："它的费用是多少？" → 你应该理解"它"指的是"重修"

## 对话策略

### 闲聊场景（直接用自然语言回答）
- 问候："你好"、"嗨"、"在吗" → 友好回应，介绍自己的功能
- 感谢："谢谢"、"感谢" → 礼貌回应，表示不客气
- 校园问题："校长是谁"、"学校在哪"、"食堂怎么样" → 基于常识回答
- 学业建议："怎么学习"、"大学要注意什么" → 给出建设性建议
- 生活话题："大学生活怎么样"、"宿舍怎么样" → 分享经验和建议
- 情感支持："压力大"、"心情不好" → 给予鼓励和安慰

### 数据查询场景（返回特定JSON格式）
只有当用户明确要求查询具体数据时，才返回JSON：
- "我的信息"、"个人资料"、"查询成绩"、"我的课程" 等
- JSON格式：{"type": "query", "intent": "个人资料/成绩/课程", "message": "友好的提示语"}

### 下载场景
当用户说"下载"、"导出"时，**不要返回JSON，直接用自然语言回复**：
- 例如："好的！我已为您生成下载链接，请点击下方按钮下载Excel文件～"
- **注意：下载URL由后端自动生成，你不需要在JSON中提供URL**

## 回答风格
- 使用轻松、友好的语气
- 适当使用🎓📚💡✨🎉等emoji
- 避免机械化的回答
- 不懂的问题就诚实说不知道，不要编造
- 保持简洁，不要长篇大论
- **保持对话连贯性**：让用户感觉你记得之前说过什么

记住：你首先是一个智能助手，其次才是数据查询工具。让对话变得有趣和连贯！`;

    // 构建消息数组（支持对话历史）
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // 添加对话历史（如果有的话）
    if (conversationHistory && conversationHistory.length > 0) {
      // 限制历史长度，避免token超限
      const maxHistoryLength = 10; // 最多保留最近5轮对话
      const historyToAdd = conversationHistory.slice(-maxHistoryLength);

      messages.push(...historyToAdd);

      logger.info('添加对话历史', { historyCount: historyToAdd.length });
    }

    // 添加当前问题
    messages.push({
      role: 'user',
      content: message
    });

    // 调用智谱API
    const response = await axios.post(
      `${API_BASE}/chat/completions`,
      {
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 30000
      }
    );

    // 解析响应
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const answer = response.data.choices[0].message.content.trim();

      logger.info('智谱AI调用成功', {
        model: MODEL,
        responseLength: answer.length,
        inputTokens: response.data.usage?.prompt_tokens,
        outputTokens: response.data.usage?.completion_tokens
      });

      return {
        success: true,
        answer: answer,
        usage: response.data.usage,
        isLocal: false
      };
    } else {
      throw new Error('API响应格式不正确');
    }

  } catch (error) {
    logger.error('智谱AI调用失败，使用本地降级方案', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // 使用本地规则引擎降级
    const localResponse = matchLocalRule(message);

    return {
      success: true,
      answer: localResponse,
      usage: null,
      isLocal: true,
      fallback: true
    };
  }
}

/**
 * 意图识别（简化版）
 */
async function detectIntent(message) {
  const keywords = {
    '个人资料': ['我的信息', '个人信息', '我的资料', '个人资料', '我的档案'],
    '成绩查询': ['我的成绩', '查询成绩', '成绩', '成绩单', '考试分数'],
    '课程查询': ['我的课程', '课程表', '课表', '上课时间', '课程查询'],
    '管理办法': ['管理办法', '管理规定', '制度', '规则']
  };

  for (const [intent, words] of Object.entries(keywords)) {
    if (words.some(word => message.includes(word))) {
      return { intent, keywords: words, action: 'query' };
    }
  }

  return { intent: 'chat', keywords: [], action: 'query' };
}

module.exports = {
  chat,
  detectIntent
};
