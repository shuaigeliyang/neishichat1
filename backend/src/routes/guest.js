/**
 * 访客聊天API路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const guestChatService = require('../services/guestChat');

/**
 * POST /api/guest/chat
 * 访客聊天接口 - 未登录用户的基本问答
 */
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    // 参数验证
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    console.log('📩 访客聊天请求:', message);

    // 调用访客聊天服务
    const answer = await guestChatService.getAnswer(message);

    res.json({
      success: true,
      data: {
        answer: answer
      }
    });

  } catch (error) {
    console.error('❌ 访客聊天错误:', error);
    res.status(500).json({
      success: false,
      message: '聊天服务暂时不可用，请稍后再试'
    });
  }
});

/**
 * GET /api/guest/school-info
 * 获取学校基本信息
 */
router.get('/school-info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '内江师范学院',
      englishName: 'Neijiang Normal University',
      address: '四川省内江市东桐路1124号',
      phone: '0832-2340666',
      postcode: '641100',
      founded: '1956年',
      motto: '明德博学，笃行创新',
      description: '内江师范学院是四川省人民政府举办的全日制普通本科院校，坐落于素有"千年绸都"美誉的内江市。'
    }
  });
});

module.exports = router;
