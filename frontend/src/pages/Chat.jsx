/**
 * AI对话页面 - 智能增强版本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, message, Spin, Badge, Divider } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, HistoryOutlined, ArrowLeftOutlined, VerticalAlignBottomOutlined, BulbOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Markdown from 'react-markdown';
import QueryResultTable from '../components/QueryResultTable';
import HandbookViewer from '../components/HandbookViewer';
import FormList from '../components/FormList';
import { detectIntent, getIntentDescription } from '../utils/intentDetector';
import './Chat.css';

function Chat({ user }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [sessionId] = useState(() => Date.now().toString());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [handbookModalVisible, setHandbookModalVisible] = useState(false);
  const [selectedPageNum, setSelectedPageNum] = useState(null);
  const [copiedFormName, setCopiedFormName] = useState(null);
  // 🎯 分页状态：为每个消息独立管理来源分页（每页5条）
  const [sourcesPageMap, setSourcesPageMap] = useState({});
  const SOURCES_PER_PAGE = 5;

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  /**
   * 清理和标准化用户输入
   * 处理重复的词语、多余的空格等
   */
  const cleanInput = (text) => {
    if (!text) return text;

    let cleaned = text;

    // 1. 去除重复的"我的"（如："我的我的我的成绩" → "我的成绩"）
    cleaned = cleaned.replace(/我的+/g, '我的');

    // 2. 去除重复的"我的"和其他词的组合（如："我的我的我的" → "我的"）
    cleaned = cleaned.replace(/(我的)\s+/g, '我的 ');

    // 3. 去除多余的空格
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 4. 去除重复的标点符号（如："！！！？" → "！"）
    cleaned = cleaned.replace(/([！？。，、；：])\1+/g, '$1');

    // 5. 去除首尾的标点符号
    cleaned = cleaned.replace(/^[！？。，、；：，]+|[！？。，、；：，]+$/g, '');

    return cleaned;
  };
  const lastMessageCountRef = useRef(0);

  // 获取对话历史 - 添加详细日志
  const fetchChatHistory = async () => {
    try {
      console.log('🔍 开始获取历史记录...');
      console.log('Token:', localStorage.getItem('token')?.substring(0, 20) + '...');

      const response = await axios.get('/api/chat/history?limit=50', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      console.log('✅ 历史记录响应:', response.data);

      if (response.data.success) {
        const history = response.data.data || [];

        if (history.length === 0) {
          message.info('暂无历史记录，开始新的对话吧！');
        } else {
          setChatHistory(history);
          message.success(`加载了 ${history.length} 条历史记录`);
        }
      } else {
        message.warning(response.data.message || '获取历史记录失败');
      }
    } catch (error) {
      console.error('❌ 获取历史记录失败：', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      message.error('获取历史记录失败：' + (error.response?.data?.message || error.message));
      setChatHistory([]);
    }
  };

  useEffect(() => {
    console.log('🚀 Chat组件加载，用户信息:', user);
    fetchChatHistory();
  }, []);

  // 智能自动滚动：只有当用户已经在底部时才自动滚动
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // 检测是否是新消息添加（不是初始化）
    const isNewMessage = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (isNewMessage && isAutoScrollEnabled) {
      // 使用 requestAnimationFrame 确保DOM完全渲染后再滚动
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom(false);
        }, 50);
      });
    }
  }, [messages, isAutoScrollEnabled]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // 判断是否在底部（容差50px）
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
    const isNearTop = scrollTop < 100;

    // 更新自动滚动状态：只有当用户滚动到底部时才重新启用自动滚动
    if (isAtBottom) {
      setIsAutoScrollEnabled(true);
      setShowScrollButton(false);
    } else {
      setIsAutoScrollEnabled(false);
      setShowScrollButton(true);
    }
  };

  const scrollToBottom = (hideButton = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // 使用原生scrollTo获得更好的性能和控制
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });

    if (hideButton) {
      setShowScrollButton(false);
      setIsAutoScrollEnabled(true);
    }
  };

  const handleDownload = async (url, type) => {
    try {
      message.loading('正在生成Excel文件...', 0);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      message.destroy();

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;

      const filename = type === '个人信息' ? '个人信息.xlsx' :
                      type === '成绩单' ? '成绩单.xlsx' :
                      type === '班级信息' ? '班级信息.xlsx' : '学院信息.xlsx';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      message.success('下载成功！');
    } catch (error) {
      message.destroy();
      message.error('下载失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleFormDownload = async (url, fileName) => {
    try {
      message.loading('正在下载表单文件...', 0);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      message.destroy();

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      message.success('表单文件下载成功！');
    } catch (error) {
      message.destroy();
      message.error('下载失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) {
      message.warning('请输入问题');
      return;
    }

    // 🔒 输入清理和标准化
    const cleanedInput = cleanInput(input);
    console.log('💬 发送消息:', input);
    if (cleanedInput !== input) {
      console.log('🧹 清理后:', cleanedInput);
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    // 发送消息时始终启用自动滚动，以便看到AI回复
    setIsAutoScrollEnabled(true);

    // 立即滚动到底部，确保用户消息可见
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    });

    try {
      // 🎯 智能意图识别（使用清理后的输入）
      const intent = detectIntent(cleanedInput);
      console.log(`🎯 识别意图：${getIntentDescription(intent)}`);

      // 根据意图直接调用对应接口（使用清理后的输入）
      if (intent === 'database') {
        // 数据库查询（个人数据）
        console.log('📊 调用数据库查询接口...');
        await handleDatabaseQuery(cleanedInput);
      } else if (intent === 'document') {
        // 文档问答（基于学生手册）
        console.log('📚 调用RAG文档问答接口...');
        await handleDocumentQuery(cleanedInput);
      } else if (intent === 'form_list') {
        // 表单列表查询
        console.log('📝 调用表单列表查询接口...');
        await handleFormQuery(cleanedInput);
      } else if (intent === 'form_generate') {
        // 表单生成
        console.log('📄 调用表单生成接口...');
        await handleFormGenerate(cleanedInput);
      } else {
        // 普通聊天（智谱AI）
        console.log('💬 调用普通聊天接口...');
        await handleChatQuery(cleanedInput);
      }

    } catch (error) {
      console.error('❌ 发送消息错误:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMsg = error.response?.data?.message || error.message;
      message.error('发送失败：' + errorMsg);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `抱歉，我暂时无法回答您的问题。\n\n**错误信息：**\n\`${errorMsg}\`\n\n请稍后再试或联系管理员。`
      }]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理数据库查询（个人数据）
   */
  const handleDatabaseQuery = async (question) => {
    try {
      const response = await axios.post(
        '/api/intelligent/query',
        { message: question, sessionId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        // 🔒 特殊处理：检查是否需要切换到普通聊天
        if (response.data.meta?.switchToChat) {
          console.log('🎉 后端返回switchToChat标记，显示表扬消息');

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response.data.answer,
            timestamp: new Date().toISOString()
          }]);

          return;
        }

        // 🔒 特殊处理：检查是否是权限拒绝或特殊消息
        if (response.data.meta?.type === 'permission_denied' || response.data.meta?.type === 'no_failed_grades') {
          console.log('📋 后端返回特殊消息:', response.data.meta?.type);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response.data.answer,
            timestamp: new Date().toISOString()
          }]);

          return;
        }

        const aiContent = response.data.data.answer;

        // 🔒 特殊处理：如果answer不是JSON，直接显示
        if (!aiContent || !aiContent.trim().startsWith('{')) {
          console.log('📝 answer不是JSON格式，直接显示');

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: aiContent || response.data.answer,
            timestamp: new Date().toISOString()
          }]);

          return;
        }

        const parsed = JSON.parse(aiContent);

        if (parsed.type === 'intelligent_query') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: parsed.message,
            isIntelligentQuery: true,
            queryData: parsed.data,
            rowCount: parsed.rowCount,
            downloadUrl: parsed.downloadUrl,
            responseType: parsed.responseType,
            explanation: parsed.explanation,
            suggestions: parsed.suggestions || []
          }]);
          return;
        }
      }

      // 如果不是智能查询结果，回退到普通聊天
      console.log('不是智能查询结果，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      console.error('❌ 数据库查询失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      message.warning('数据库查询服务暂时不可用，正在使用AI助手为您回答...');

      // 添加降级通知
      setMessages(prev => [...prev, {
        role: 'system',
        content: '📊 数据库查询服务暂时不可用，正在使用AI助手为您回答...',
        timestamp: new Date().toISOString()
      }]);

      await handleChatQuery(question);
    }
  };

  /**
   * 处理表单查询
   */
  const handleFormQuery = async (question) => {
    try {
      const response = await axios.get('/api/forms', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success && response.data.data) {
        const forms = response.data.data;

        // 按项目组织表单（与实际目录结构对齐）
        const formsByProject = forms.reduce((acc, form) => {
          const project = form.project_name || '其他';
          if (!acc[project]) {
            acc[project] = [];
          }
          acc[project].push(form);
          return acc;
        }, {});

        // 构建表单列表消息
        let formContent = '📝 **系统可下载的表单列表**\n\n';
        formContent += '📁 按项目分类（与实际目录完全对齐）\n\n';

        Object.keys(formsByProject).sort().forEach(project => {
          formContent += `### 【${project}】\n`;
          formsByProject[project].forEach(form => {
            // 使用代码块格式，方便用户复制完整的表单名称
            formContent += `- \`${form.template_name}\`\n`;
            if (form.description) {
              formContent += `  ${form.description}\n`;
            }
          });
          formContent += '\n';
        });

        formContent += `---\n\n💡 **提示：** 点击下方按钮可以直接生成表单，或复制表单名称后输入"下载[表单名称]"。\n\n`;

        // 添加快速生成按钮列表
        formContent += `**🚀 快速生成（点击即可）：**\n\n`;

        Object.keys(formsByProject).sort().forEach(project => {
          formContent += `**【${project}】**\n`;
          formsByProject[project].forEach(form => {
            formContent += `📄 [${form.template_name}](#form:${form.template_id})\n`;
          });
        });

        formContent += `\n\n**💡 或者手动输入：**\n`;
        formContent += `- "下载竞赛申请表"\n`;
        formContent += `- "生成奖学金申请表"\n`;
        formContent += `- "我要转专业申请表"`;

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: formContent,
          isFormList: true,
          forms: forms,
          // 添加复制提示
          extraInfo: '💡 提示：点击表单名称可自动复制到输入框'
        }]);
        return;
      }

      // 如果获取失败，回退到普通聊天
      console.log('获取表单列表失败，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      console.error('❌ 表单查询失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      message.warning('表单查询服务暂时不可用，正在使用AI助手为您回答...');

      // 添加降级通知
      setMessages(prev => [...prev, {
        role: 'system',
        content: '📝 表单查询服务暂时不可用，正在使用AI助手为您回答...',
        timestamp: new Date().toISOString()
      }]);

      await handleChatQuery(question);
    }
  };

  /**
   * 处理表单生成
   */
  const handleFormGenerate = async (question) => {
    try {
      console.log('📄 发送表单生成请求:', question);

      // 直接发送用户输入给后端，由后端的智能匹配来识别表单
      const response = await axios.post('/api/forms/generate',
        { templateName: question },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success && response.data.data) {
        const { fileName, downloadUrl, templateName } = response.data.data;

        // 构建成功消息
        const successContent = `✅ **表单生成成功！**\n\n` +
          `📄 **表单名称：** ${templateName}\n` +
          `📁 **文件名：** ${fileName}\n\n` +
          `💡 **提示：** 请点击下方按钮下载文件。\n\n` +
          `如果您还需要其他表单，可以说：\n` +
          `- "下载竞赛申请表"\n` +
          `- "生成奖学金申请表"`;

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: successContent,
          isFormDownload: true,
          downloadUrl: downloadUrl,
          fileName: fileName
        }]);
        return;
      }

      // 如果生成失败，回退到普通聊天
      console.log('表单生成失败，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      console.error('❌ 表单生成失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      // 显示后端返回的错误信息
      const errorMsg = error.response?.data?.message || error.message;

      message.warning('表单生成服务暂时不可用，正在使用AI助手为您回答...');

      // 添加降级通知
      setMessages(prev => [...prev, {
        role: 'system',
        content: '📄 表单生成服务暂时不可用，正在使用AI助手为您回答...',
        timestamp: new Date().toISOString()
      }]);

      await handleChatQuery(question);
    }
  };

  /**
   * 处理文档问答（基于学生手册）
   */
  const handleDocumentQuery = async (question) => {
    console.log('📚 [RAG] 开始处理文档问答:', question);
    try {
      const response = await axios.post(
        '/api/rag/answer',
        { question: question },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      console.log('📚 [RAG] 收到响应:', {
        success: response.data.success,
        hasData: !!response.data.data,
        dataKeys: response.data.data ? Object.keys(response.data.data) : []
      });

      if (response.data.success && response.data.data) {
        const ragData = response.data.data;

        console.log('📚 [RAG] 成功，显示结果:', {
          answerLength: ragData.answer?.length || 0,
          sourcesCount: ragData.sources?.length || 0,
          confidence: ragData.confidence,
          answerPreview: ragData.answer?.substring(0, 100)
        });

        // 🔒 特殊处理：检测RAG是否找不到相关文档
        const notFoundKeywords = [
          '没有找到', '未找到', '抱歉', '对不起',
          '建议您检查问题表述', '查阅学生手册纸质版',
          '根据学生手册，没有找到'
        ];

        const isNotFound = ragData.answer && notFoundKeywords.some(keyword =>
          ragData.answer.includes(keyword)
        );

        // 如果RAG找不到文档，降级到普通聊天
        if (isNotFound || (ragData.sources && ragData.sources.length === 0)) {
          console.log('📚 [RAG] 未找到相关文档，降级到普通聊天');

          message.info('📚 学生手册中没有找到完全匹配的信息，正在使用AI助手为您解答...');

          // 添加降级通知
          setMessages(prev => [...prev, {
            role: 'system',
            content: '📚 学生手册中没有找到完全匹配的信息，正在使用AI助手为您解答...',
            timestamp: new Date().toISOString()
          }]);

          // 降级到普通聊天
          await handleChatQuery(question);
          return;
        }

        // 构建RAG回答消息
        let ragContent = ragData.answer;

        // 添加来源信息（不在这里添加，在渲染时处理）
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: ragContent,
          isRAGAnswer: true,
          sources: ragData.sources || [],
          confidence: ragData.confidence
        }]);
        return;
      }

      // RAG失败，回退到普通聊天
      console.log('📚 [RAG] 返回成功但没有数据，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      // 优化2：详细的错误日志记录
      console.error('❌ RAG文档问答失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });

      // 优化2：向用户显示友好的错误提示
      message.warning('文档查询服务暂时不可用，正在使用AI助手为您回答...');

      // 优化3：添加系统消息通知用户降级机制
      setMessages(prev => [...prev, {
        role: 'system',
        content: '📚 文档查询服务暂时不可用，正在使用AI助手为您回答...',
        timestamp: new Date().toISOString()
      }]);

      // 回退到普通聊天
      await handleChatQuery(question);
    }
  };

  /**
   * 处理普通聊天（智谱AI）
   */
  const handleChatQuery = async (question) => {
    console.log('📡 发送请求到 /api/chat');

    try {
      const response = await axios.post(
        '/api/chat',
        { message: question, sessionId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      console.log('✅ 收到响应:', response.data);

      if (response.data.success) {
        let aiContent = response.data.data.answer;

        try {
          const parsed = JSON.parse(aiContent);
          if (parsed.type === 'profile') {
            aiContent = renderProfile(parsed.data);
          } else if (parsed.type === 'grades') {
            aiContent = renderGrades(parsed.data, parsed.message);
          } else if (parsed.type === 'courses') {
            aiContent = renderCourses(parsed.data, parsed.message);
          } else if (parsed.type === 'regulations') {
            aiContent = renderRegulations(parsed.data, parsed.message);
          } else if (parsed.type === 'download') {
            // 验证downloadUrl是否有效（必须是/api/开头的相对路径）
            const downloadUrl = parsed.downloadUrl;
            if (!downloadUrl || !downloadUrl.startsWith('/api/')) {
              console.error('❌ 无效的下载URL:', downloadUrl);
              message.error('下载链接无效，请联系管理员');
              return;
            }

            return setMessages(prev => [...prev, {
              role: 'assistant',
              content: parsed.message,
              isDownload: true,
              downloadUrl: downloadUrl,
              downloadType: parsed.downloadType
            }]);
          } else if (parsed.type === 'form_download') {
            // 🎯 处理表单下载响应
            const downloadUrl = parsed.downloadUrl;
            const fileName = parsed.fileName;
            const templateName = parsed.templateName;

            if (!downloadUrl || !downloadUrl.startsWith('/api/')) {
              console.error('❌ 无效的表单下载URL:', downloadUrl);
              message.error('表单下载链接无效，请联系管理员');
              return;
            }

            // 构建成功消息
            const successContent = parsed.message || `✅ **表单生成成功！**\n\n` +
              `📄 **表单名称：** ${templateName}\n` +
              `📁 **文件名：** ${fileName}\n\n` +
              `💡 **提示：** 请点击下方按钮下载文件。`;

            return setMessages(prev => [...prev, {
              role: 'assistant',
              content: successContent,
              isFormDownload: true,
              downloadUrl: downloadUrl,
              fileName: fileName
            }]);
          }
        } catch (e) {
          console.log('📝 不是JSON，作为普通文本处理');
        }

        setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
      }
    } catch (error) {
      console.error('❌ 聊天请求失败:', error);
      throw error; // 重新抛出错误，让外层处理
    }
  };

  const renderProfile = (data) => {
    return `## 个人信息

**姓名：** ${data.name || '未填写'}

**学号：** ${data.student_code || '未填写'}

**性别：** ${data.gender || '未填写'}

**学院：** ${data.college_name || '未填写'}

**专业：** ${data.major_name || '未填写'}

**班级：** ${data.class_name || '未填写'}

**学制：** ${data.duration ? data.duration + '年' : '未填写'}

**政治面貌：** ${data.political_status || '未填写'}

**民族：** ${data.nation || '未填写'}

**联系电话：** ${data.phone || '未填写'}

**邮箱：** ${data.email || '未填写'}

**宿舍：** ${data.dormitory || '未填写'}

**学籍状态：** ${data.status || '未填写'}`;
  };

  const renderGrades = (grades, msg) => {
    let content = `## ${msg || '成绩信息'}\n\n`;

    if (!grades || grades.length === 0) {
      content += '暂无成绩记录';
      return content;
    }

    grades.forEach((grade, index) => {
      content += `### ${index + 1}. ${grade.course_name}\n`;
      content += `- **课程代码：** ${grade.course_code}\n`;
      content += `- **学分：** ${grade.credits}\n`;
      content += `- **成绩：** ${grade.total_score}分\n`;
      content += `- **学期：** ${grade.semester}\n`;
      if (grade.teacher_name) {
        content += `- **授课教师：** ${grade.teacher_name}\n`;
      }
      content += '\n';
    });

    return content;
  };

  const renderCourses = (courses, msg) => {
    let content = `## ${msg || '课程信息'}\n\n`;

    if (!courses || courses.length === 0) {
      content += '暂无课程记录';
      return content;
    }

    courses.forEach((course, index) => {
      content += `### ${index + 1}. ${course.course_name}\n`;
      content += `- **课程代码：** ${course.course_code}\n`;
      content += `- **学分：** ${course.credits}\n`;
      content += `- **课程类型：** ${course.course_type}\n`;
      if (course.teacher_name) {
        content += `- **授课教师：** ${course.teacher_name}\n`;
      }
      if (course.schedule) {
        content += `- **上课时间：** ${course.schedule}\n`;
      }
      if (course.classroom) {
        content += `- **上课地点：** ${course.classroom}\n`;
      }
      content += `- **学期：** ${course.semester}\n\n`;
    });

    return content;
  };

  const renderRegulations = (regulations, msg) => {
    let content = `## ${msg || '管理办法'}\n\n`;

    if (!regulations || regulations.length === 0) {
      content += '暂无相关管理办法';
      return content;
    }

    regulations.forEach((reg, index) => {
      content += `### ${index + 1}. ${reg.title}\n`;
      content += `- **分类：** ${reg.category}\n`;
      content += `- **版本：** ${reg.version}\n`;
      content += `- **生效日期：** ${reg.effective_date}\n`;
      if (reg.view_count !== undefined) {
        content += `- **浏览次数：** ${reg.view_count}\n`;
      }
      content += `\n**内容摘要：**\n${reg.content ? reg.content.substring(0, 200) + '...' : '无'}\n\n`;
    });

    return content;
  };

  return (
    <div className="chat-container">
      <Card className="chat-card">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ fontSize: '16px' }}
            >
              返回
            </Button>
            <div>
              <h2>智能助手</h2>
              <p>欢迎，{user.name}！有什么我可以帮助您的吗？</p>
            </div>
          </div>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => {
              fetchChatHistory();
              setHistoryVisible(true);
            }}
          >
            历史记录
            {chatHistory.length > 0 && (
              <Badge count={chatHistory.length} style={{ marginLeft: 8 }} />
            )}
          </Button>
        </div>

        <div
          ref={messagesContainerRef}
          className="chat-messages"
          onScroll={handleScroll}
        >
          {messages.length === 0 && (
            <div className="chat-welcome">
              <RobotOutlined style={{ fontSize: 64, color: '#667eea' }} />
              <h3>👋 您好！我是小智，您的智能学习助手~</h3>
              <p>🎓 我可以帮您：</p>
              <ul>
                <li>📊 查询个人信息、成绩、课程表</li>
                <li>📥 下载各类表格数据</li>
                <li>💬 回答大学生活相关问题</li>
                <li>🎯 提供学习建议和指导</li>
                <li>😊 陪您聊天解闷</li>
              </ul>
              <p style={{ marginTop: 20, color: '#999' }}>
                试试问我："你好"、"最近压力大"、"校长是谁"、"我的成绩"...
              </p>
              {chatHistory.length > 0 && (
                <p style={{ marginTop: 10, color: '#667eea', fontSize: '12px' }}>
                  💡 您有 {chatHistory.length} 条历史记录，点击右上角"历史记录"查看
                </p>
              )}
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.role === 'user' && <UserOutlined />}
              {msg.role === 'assistant' && <RobotOutlined />}
              <div className="message-content">
                {msg.isFormList ? (
                  <FormList
                    content={msg.content}
                    forms={msg.forms || []}
                    onCopyFormName={(text) => {
                      setInput(text);
                      setCopiedFormName(text);
                      message.success('✅ 已复制到输入框，点击发送即可生成表单！');
                    }}
                  />
                ) : msg.isFormDownload ? (
                  <div>
                    <Markdown>{msg.content}</Markdown>
                    <button
                      onClick={() => handleFormDownload(msg.downloadUrl, msg.fileName)}
                      className="download-button"
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#5568d3';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#667eea';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      📥 点击下载表单文件
                    </button>
                  </div>
                ) : msg.isDownload ? (
                  <div>
                    <p>{msg.content}</p>
                    <button
                      onClick={() => handleDownload(msg.downloadUrl, msg.downloadType)}
                      className="download-button"
                    >
                      📥 点击下载 {msg.downloadType}
                    </button>
                  </div>
                ) : msg.isIntelligentQuery ? (
                  <div style={{ width: '100%' }}>
                    {/* 查询说明 */}
                    <Markdown>{msg.content}</Markdown>

                    {/* 查询结果表格 */}
                    {msg.queryData && msg.queryData.length > 0 && (
                      <QueryResultTable
                        data={msg.queryData}
                        rowCount={msg.rowCount}
                        downloadUrl={msg.downloadUrl}
                      />
                    )}

                    {/* 下载按钮（如果没有数据预览） */}
                    {msg.downloadUrl && (!msg.queryData || msg.queryData.length === 0) && (
                      <button
                        onClick={() => handleDownload(msg.downloadUrl, '查询结果')}
                        className="download-button"
                      >
                        📥 点击下载查询结果
                      </button>
                    )}

                    {/* 建议 */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <Divider style={{ margin: '12px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
                          <BulbOutlined style={{ color: '#faad14' }} />
                          <span style={{ fontWeight: 500, color: '#666' }}>后续查询建议：</span>
                        </div>
                        {msg.suggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              background: '#f5f5f5',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#667eea',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => setInput(suggestion)}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#e6e6e6';
                              e.target.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#f5f5f5';
                              e.target.style.transform = 'translateX(0)';
                            }}
                          >
                            💡 {suggestion}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 解释说明 */}
                    {msg.explanation && (
                      <div style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        background: '#e6f7ff',
                        borderLeft: '3px solid #1890ff',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: '#666'
                      }}>
                        <strong>💡 查询说明：</strong>{msg.explanation}
                      </div>
                    )}
                  </div>
                ) : msg.isRAGAnswer ? (
                  <div style={{ width: '100%' }}>
                    {/* RAG回答内容 */}
                    <Markdown>{msg.content}</Markdown>

                    {/* 可点击的来源链接 - 支持分页 */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <Divider style={{ margin: '12px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOutlined style={{ color: '#1890ff' }} />
                            <span style={{ fontWeight: 500, color: '#666' }}>📖 参考来源：</span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#999' }}>
                            共 {msg.sources.length} 条
                          </span>
                        </div>

                        {/* 计算当前页的来源 */}
                        {(() => {
                          const currentPage = sourcesPageMap[index] || 1;
                          const totalPages = Math.ceil(msg.sources.length / SOURCES_PER_PAGE);
                          const startIndex = (currentPage - 1) * SOURCES_PER_PAGE;
                          const endIndex = startIndex + SOURCES_PER_PAGE;
                          const currentSources = msg.sources.slice(startIndex, endIndex);

                          return (
                            <>
                              {/* 当前页的来源列表 */}
                              {currentSources.map((source, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setSelectedPageNum(source.page);
                                    setHandbookModalVisible(true);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    background: '#e6f7ff',
                                    border: '1px solid #91d5ff',
                                    borderRadius: '6px',
                                    marginBottom: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#0050b3',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = '#bae7ff';
                                    e.target.style.transform = 'translateX(4px)';
                                    e.target.style.borderColor = '#69c0ff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = '#e6f7ff';
                                    e.target.style.transform = 'translateX(0)';
                                    e.target.style.borderColor = '#91d5ff';
                                  }}
                                >
                                  <BookOutlined />
                                  <span style={{ flex: 1 }}>
                                    {source.chapter || '未知章节'}（第{source.page}页）
                                  </span>
                                  <span style={{ fontSize: '12px', color: '#999' }}>
                                    点击查看 →
                                  </span>
                                </div>
                              ))}

                              {/* 分页控件 */}
                              {totalPages > 1 && (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    marginTop: '12px',
                                    padding: '8px',
                                    background: '#f5f5f5',
                                    borderRadius: '6px'
                                  }}
                                >
                                  <Button
                                    size="small"
                                    icon={<span>←</span>}
                                    disabled={currentPage === 1}
                                    onClick={() => {
                                      setSourcesPageMap(prev => ({
                                        ...prev,
                                        [index]: currentPage - 1
                                      }));
                                    }}
                                    style={{
                                      fontSize: '12px',
                                      minWidth: '60px'
                                    }}
                                  >
                                    上一页
                                  </Button>

                                  <span
                                    style={{
                                      fontSize: '13px',
                                      color: '#666',
                                      fontWeight: 500
                                    }}
                                  >
                                    第 {currentPage} / {totalPages} 页
                                  </span>

                                  <Button
                                    size="small"
                                    icon={<span>→</span>}
                                    disabled={currentPage === totalPages}
                                    onClick={() => {
                                      setSourcesPageMap(prev => ({
                                        ...prev,
                                        [index]: currentPage + 1
                                      }));
                                    }}
                                    style={{
                                      fontSize: '12px',
                                      minWidth: '60px'
                                    }}
                                  >
                                    下一页
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* 置信度信息 */}
                    {msg.confidence && (
                      <div style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#666',
                        textAlign: 'center'
                      }}>
                        🎯 置信度：{(msg.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ) : msg.role === 'assistant' ? (
                  <Markdown>{msg.content}</Markdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <RobotOutlined />
              <div className="message-content">
                <Spin size="small" /> 正在思考中...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <Button
            type="primary"
            shape="circle"
            icon={<VerticalAlignBottomOutlined />}
            onClick={scrollToBottom}
            className="scroll-to-bottom-button"
          >
            回到底部
          </Button>
        )}

        <div className="chat-input">
          <Input
            size="large"
            placeholder="输入您的问题...（试试：你好 / 查询成绩 / 大学生活建议）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSend}
            disabled={loading}
            suffix={
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={loading}
              >
                发送
              </Button>
            }
          />
        </div>
      </Card>

      <Card
        title="对话历史"
        className="chat-history-panel"
        style={{
          position: 'fixed',
          right: historyVisible ? '20px' : '-400px',
          top: '20px',
          width: '350px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          transition: 'right 0.3s ease',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}
      >
        <Button
          type="text"
          onClick={() => setHistoryVisible(false)}
          style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '18px' }}
        >
          ×
        </Button>
        {chatHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: '#999' }}>暂无历史记录</p>
            <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
              开始对话后，记录会保存在这里
            </p>
          </div>
        ) : (
          chatHistory.map((item) => (
            <div
              key={item.chat_id}
              className="history-item"
              onClick={() => {
                setMessages([
                  { role: 'user', content: item.user_question },
                  { role: 'assistant', content: item.ai_answer_preview || item.ai_answer }
                ]);
                setHistoryVisible(false);
                message.success('已加载历史对话');
              }}
            >
              <div className="history-item-time">
                {new Date(item.created_at).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="history-item-question">
                {item.user_question}
              </div>
              <div className="history-item-intent">
                {item.intent === 'chat' ? '💬 闲聊' :
                 item.intent === 'download' ? '📥 下载' : '📊 查询'}
              </div>
            </div>
          ))
        )}
      </Card>

      {/* 学生手册查看器 */}
      <HandbookViewer
        visible={handbookModalVisible}
        onClose={() => setHandbookModalVisible(false)}
        pageNum={selectedPageNum}
      />
    </div>
  );
}

export default Chat;
