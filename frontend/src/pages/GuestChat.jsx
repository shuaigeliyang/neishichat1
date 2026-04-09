/**
 * 访客聊天页面 - 未登录状态
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, message, Modal } from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  LoginOutlined
} from '@ant-design/icons';
import axios from 'axios';
import Markdown from 'react-markdown';
import './GuestChat.css';

function GuestChat({ onLoginRequest }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 初始化欢迎消息
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `👋 您好！欢迎来到内江师范学院！

我是智能助手小智，很高兴为您服务~ (￣▽￣)ﾉ

**访客模式下我可以为您：**
- 📚 介绍学校基本信息
- 🏛️ 解答校园相关问题
- 💬 进行简单的对话交流

**如需使用完整功能，请先登录：**
- 📊 查询成绩、课程、个人信息
- 📥 下载各类表格和表单
- 📖 查询学生手册和政策

💡 试试问我：**"介绍一下学校"** 或 **"学校有哪些专业"**`
      }
    ]);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) {
      message.warning('请输入问题');
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 先检查是否需要受限功能
      const restrictedKeywords = [
        '我的成绩', '我的课程', '我的信息', '个人信息',
        '下载', '表单', '表格', '挂科', '奖学金', '密码'
      ];

      const needsLogin = restrictedKeywords.some(keyword =>
        input.toLowerCase().includes(keyword.toLowerCase())
      );

      if (needsLogin) {
        // 模拟思考延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🔒 **抱歉，此功能需要登录后才能使用**

您的问题是："${input}"

**登录后您可以：**
- 📊 查询成绩、课程表、个人信息
- 📥 下载各类申请表格和表单
- 📖 查询学生手册和学校政策
- 💬 使用完整的智能问答功能

**请点击下方按钮登录：**`,
          needsLogin: true
        }]);
        setLoading(false);
        return;
      }

      // 调用访客聊天API
      const response = await axios.post('/api/guest/chat', {
        message: input
      });

      if (response.data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.data.answer
        }]);
      } else {
        throw new Error(response.data.message || '请求失败');
      }

    } catch (error) {
      console.error('聊天失败:', error);

      // 如果API失败，使用本地问答逻辑
      const localAnswer = getLocalAnswer(input);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: localAnswer
      }]);
    } finally {
      setLoading(false);
    }
  };

  // 本地问答逻辑（备用方案）
  const getLocalAnswer = (question) => {
    const q = question.toLowerCase();

    // 学校介绍
    if (q.includes('介绍') || q.includes('简介') || q.includes('学校') || q.includes('内江师范')) {
      return `🏛️ **内江师范学院简介**

内江师范学院是四川省人民政府举办的全日制普通本科院校，坐落于素有"千年绸都"美誉的内江市。

**基本信息：**
- 📍 地址：四川省内江市东桐路1124号
- 📞 电话：0832-2340666
- 📮 邮编：641100
- 🎓 创建时间：1956年

**办学特色：**
- 教师教育特色鲜明
- 多学科协调发展
- 应用型人才培养

**学院设置：**
学校设有文学院、数学与信息科学学院、外国语学院、化学化工学院、音乐学院、美术学院、体育学院等20个二级学院。

**校园文化：**
- 📜 校训：明德博学，笃行创新
- 💫 校风：团结、勤奋、求实、创新

还有什么想了解的吗？(￣▽￣)ﾉ`;
    }

    // 专业相关
    if (q.includes('专业') || q.includes('学院')) {
      return `📚 **专业设置**

内江师范学院设有以下主要学院：

**人文社科类：**
- 文学院（汉语言文学、汉语国际教育等）
- 外国语学院（英语、商务英语等）
- 政法与历史学院（历史学、思想政治教育等）

**理工类：**
- 数学与信息科学学院（数学与应用数学、信息与计算科学等）
- 化学化工学院（化学、应用化学等）
- 计算机科学学院（计算机科学与技术、软件工程等）
- 工程技术学院（物理学、土木工程等）

**艺术体育类：**
- 音乐学院（音乐学、音乐表演等）
- 美术学院（美术学、视觉传达设计等）
- 体育学院（体育教育、社会体育指导与管理等）

**经管教类：**
- 管理学院（工商管理、财务管理等）
- 经济与管理学院（经济学、国际经济与贸易等）
- 教育科学学院（教育学、学前教育等）

具体的专业介绍和招生信息，建议访问学校官网或咨询招生办公室！(^_^)b`;
    }

    // 位置和地址
    if (q.includes('地址') || q.includes('位置') || q.includes('在哪') || q.includes('怎么去')) {
      return `📍 **学校位置**

**详细地址：**
四川省内江市东桐路1124号

**交通指南：**
- 🚂 火车站：内江站下车，乘坐公交或出租车约15分钟
- 🚌 汽车：内江客运中心下车，转乘公交或出租车约10分钟
- ✈️ 飞机：成都双流机场下车，转乘高铁或大巴约1.5小时

**联系电话：** 0832-2340666

欢迎实地参观！🎓`;
    }

    // 校园环境
    if (q.includes('环境') || q.includes('风景') || q.includes('漂亮') || q.includes('美')) {
      return `🌸 **校园环境**

内江师范学院校园环境优美，是学习和生活的理想场所！

**校园特色：**
- 🏞️ 绿化覆盖率高，四季常青
- 🌸 樱花、桂花等花卉点缀校园
- 📚 现代化的图书馆和教学设施
- 🏃‍♀️ 完善的体育场馆和设施
- 🍱 干净整洁的学生食堂

**生活设施：**
- 🏠 舒适的学生宿舍
- 🍜 多样化的食堂餐饮
- 🏪 便利的校园超市
- 💻 完善的网络覆盖

欢迎来校参观体验！(￣▽￣)ﾉ`;
    }

    // 招生相关
    if (q.includes('招生') || q.includes('录取') || q.includes('分数') || q.includes('报考')) {
      return `📝 **招生信息**

**招生咨询：**
- 📞 招生办电话：0832-2340666
- 🌐 学校官网：www.njtc.edu.cn
- 📮 招生邮箱：zsb@njtc.edu.cn

**温馨提示：**
具体的招生计划、录取分数线、报考要求等信息，请以当年官方公布为准。

建议您：
1. 访问学校招生信息网查看最新信息
2. 关注学校官方微信公众号
3. 直接致电招生办公室咨询

祝您金榜题名！🎓`;
    }

    // 默认回复
    return `😊 感谢您的提问！

关于"${question}"这个问题，在访客模式下我可能无法提供详细信息。

**您可以：**
1. 💬 **继续提问**关于学校的基本信息
2. 🔑 **点击登录**使用完整的智能助手功能
3. 📞 **致电学校** 0832-2340666 获取准确信息

还有什么我可以帮您的吗？(￣▽￣)ﾉ`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="guest-chat">
      {/* 消息区域 */}
      <div className="guest-messages" ref={messagesContainerRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`guest-message-row ${msg.role}`}>
            {msg.role === 'user' ? (
              <>
                <div className="guest-message-bubble user">
                  <div className="message-content">
                    {msg.content}
                  </div>
                </div>
                <div className="guest-message-avatar user">
                  <UserOutlined />
                </div>
              </>
            ) : (
              <>
                <div className="guest-message-avatar assistant">
                  <RobotOutlined style={{ color: '#667eea' }} />
                </div>
                <div className="guest-message-bubble assistant">
                  <div className="message-content">
                    <Markdown>{msg.content}</Markdown>
                    {msg.needsLogin && (
                      <Button
                        type="primary"
                        icon={<LoginOutlined />}
                        onClick={onLoginRequest}
                        style={{ marginTop: '15px' }}
                      >
                        立即登录
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="guest-message-row assistant">
            <div className="guest-message-avatar assistant">
              <RobotOutlined style={{ color: '#667eea' }} />
            </div>
            <div className="guest-message-bubble assistant">
              <div className="message-content loading">
                正在思考中...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="guest-input-area">
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleKeyPress}
          placeholder="输入您的问题...（Enter发送，Shift+Enter换行）"
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="guest-input"
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          className="guest-send-btn"
        >
          发送
        </Button>
      </div>

      {/* 底部提示 */}
      <div className="guest-footer-tip">
        💡 访客模式仅支持基本问答，登录后可使用完整功能
      </div>
    </div>
  );
}

export default GuestChat;
