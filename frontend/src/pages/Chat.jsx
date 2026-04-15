/**
 * AI对话页面 - 全新设计
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, message, Spin, Badge, Dropdown, Modal, Divider, Select } from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  HistoryOutlined,
  ArrowLeftOutlined,
  VerticalAlignBottomOutlined,
  BulbOutlined,
  BookOutlined,
  MenuOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SmileOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Markdown from 'react-markdown';
import QueryResultTable from '../components/QueryResultTable';
import HandbookViewer from '../components/HandbookViewer';
import FormList from '../components/FormList';
import { detectIntent, getIntentDescription } from '../utils/intentDetector';
import './Chat.css';

function Chat({ user, isFullscreen = false, onFullscreenToggle = () => {}, onChatClose = () => {}, selectedHistory, onHistoryOpen = () => {} }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [sessionId] = useState(() => Date.now().toString());
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [handbookModalVisible, setHandbookModalVisible] = useState(false);
  const [selectedPageNum, setSelectedPageNum] = useState(null);
  const [selectedSourceContent, setSelectedSourceContent] = useState(null);  // 预加载的来源内容
  const [selectedDocumentName, setSelectedDocumentName] = useState(null);  // 当前文档名称
  const [sourcesPageMap, setSourcesPageMap] = useState({});
  const SOURCES_PER_PAGE = 5;
  const [multiline, setMultiline] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // ✨ 新增：文档选择相关状态
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('all');  // 'all' 表示全部文档

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // 当组件挂载时，确保历史记录界面是关闭的
  useEffect(() => {
    setSidebarVisible(false);
  }, []);

  /**
   * 获取AI表情图标 - 根据对话内容动态显示
   */
  const getAIIcon = (msg) => {
    if (msg.role === 'system') {
      return <LoadingOutlined style={{ color: '#FF99CC' }} />;
    }

    const content = msg.content || '';

    // 根据关键词返回不同表情
    if (content.includes('✅') || content.includes('成功') || content.includes('完成')) {
      return <SmileOutlined style={{ color: '#52c41a' }} />;
    }
    if (content.includes('💡') || content.includes('建议') || content.includes('提示')) {
      return <BulbOutlined style={{ color: '#FF99CC' }} />;
    }
    if (content.includes('⚡') || content.includes('快速') || content.includes('立即')) {
      return <ThunderboltOutlined style={{ color: '#FF66AB' }} />;
    }
    if (content.includes('❌') || content.includes('错误') || content.includes('失败')) {
      return <RobotOutlined style={{ color: '#ff4d4f' }} />;
    }
    if (content.includes('📊') || content.includes('查询') || content.includes('数据')) {
      return <ThunderboltOutlined style={{ color: '#9B4DCA' }} />;
    }

    // 默认表情
    return <RobotOutlined style={{ color: '#FF66AB' }} />;
  };

  /**
   * 清理和标准化用户输入
   */
  const cleanInput = (text) => {
    if (!text) return text;

    let cleaned = text;
    cleaned = cleaned.replace(/我的+/g, '我的');
    cleaned = cleaned.replace(/(我的)\s+/g, '我的 ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/([！？。，、；：])\1+/g, '$1');
    cleaned = cleaned.replace(/^[！？。，、；：，]+|[！？。，、；：，]+$/g, '');

    return cleaned;
  };

  const lastMessageCountRef = useRef(0);

  // 获取对话历史
  const fetchChatHistory = async () => {
    try {
      console.log('🔍 开始获取历史记录...');

      const response = await axios.get('/api/chat/history?limit=50', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const history = response.data.data || [];

        if (history.length === 0) {
          // 不显示消息，避免打扰
        } else {
          setChatHistory(history);
        }
      }
    } catch (error) {
      console.error('❌ 获取历史记录失败：', error);
      setChatHistory([]);
    }
  };

  useEffect(() => {
    console.log('🚀 Chat组件加载，用户信息:', user);
    fetchChatHistory();

    // ✨ 新增：获取已索引文档列表
    fetchAvailableDocuments();
  }, []);

  // ✨ 新增：获取可用的文档列表
  const fetchAvailableDocuments = async () => {
    try {
      const response = await axios.get('/api/rag-v2/documents', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success && response.data.data) {
        const docs = response.data.data.documents || [];
        setAvailableDocuments(docs);
        console.log('📚 已索引文档:', docs);
      }
    } catch (error) {
      console.error('❌ 获取文档列表失败:', error);
      // 静默失败，不影响聊天功能
    }
  };

  // 智能自动滚动
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNewMessage = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (isNewMessage && isAutoScrollEnabled) {
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

    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;

    if (isAtBottom) {
      setIsAutoScrollEnabled(true);
      setShowScrollButton(false);
    } else {
      setIsAutoScrollEnabled(false);
      setShowScrollButton(true);
    }
  };

  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  /**
   * 消息快速操作
   */
  const handleMessageAction = (action, messageIndex) => {
    const msg = messages[messageIndex];

    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(msg.content);
        message.success('✅ 已复制到剪贴板');
        break;
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: '确定要删除这条消息吗？',
          onOk: () => {
            setMessages(prev => prev.filter((_, i) => i !== messageIndex));
            message.success('已删除消息');
          }
        });
        break;
      case 'regenerate':
        if (msg.role === 'user') {
          // 重新发送用户消息
          regenerateMessage(messageIndex);
        }
        break;
    }
  };

  /**
   * 重新生成消息
   */
  const regenerateMessage = async (messageIndex) => {
    const userMsg = messages[messageIndex];
    if (!userMsg || userMsg.role !== 'user') return;

    // 删除这条消息及之后的所有消息
    setMessages(prev => prev.slice(0, messageIndex));

    // 重新发送
    setInput(userMsg.content);
    handleSend();
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

    const cleanedInput = cleanInput(input);
    console.log('💬 发送消息:', input);
    if (cleanedInput !== input) {
      console.log('🧹 清理后:', cleanedInput);
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setMultiline(false);
    setIsAutoScrollEnabled(true);

    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    });

    try {
      const intent = detectIntent(cleanedInput);
      console.log(`🎯 识别意图：${getIntentDescription(intent)}`);

      if (intent === 'database') {
        console.log('📊 调用数据库查询接口...');
        await handleDatabaseQuery(cleanedInput);
      } else if (intent === 'document') {
        console.log('📚 调用RAG文档问答接口...');
        await handleDocumentQuery(cleanedInput);
      } else if (intent === 'form_list') {
        console.log('📝 调用表单列表查询接口...');
        await handleFormQuery(cleanedInput);
      } else if (intent === 'form_generate') {
        console.log('📄 调用表单生成接口...');
        await handleFormGenerate(cleanedInput);
      } else {
        console.log('💬 调用普通聊天接口...');
        await handleChatQuery(cleanedInput);
      }

    } catch (error) {
      console.error('❌ 发送消息错误:', error);

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
        if (response.data.meta?.switchToChat) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response.data.answer,
            timestamp: new Date().toISOString()
          }]);
          return;
        }

        if (response.data.meta?.type === 'permission_denied' || response.data.meta?.type === 'no_failed_grades') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response.data.answer,
            timestamp: new Date().toISOString()
          }]);
          return;
        }

        const aiContent = response.data.data.answer;

        if (!aiContent || !aiContent.trim().startsWith('{')) {
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

      console.log('不是智能查询结果，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      console.error('❌ 数据库查询失败:', error);
      message.warning('数据库查询服务暂时不可用，正在使用AI助手为您回答...');

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

        const formsByProject = forms.reduce((acc, form) => {
          const project = form.project_name || '其他';
          if (!acc[project]) {
            acc[project] = [];
          }
          acc[project].push(form);
          return acc;
        }, {});

        let formContent = '📝 **系统可下载的表单列表**\n\n';
        formContent += '📁 按项目分类\n\n';

        Object.keys(formsByProject).sort().forEach(project => {
          formContent += `### 【${project}】\n`;
          formsByProject[project].forEach(form => {
            formContent += `- \`${form.template_name}\`\n`;
            if (form.description) {
              formContent += `  ${form.description}\n`;
            }
          });
          formContent += '\n';
        });

        formContent += `---\n\n💡 **提示：** 点击下方按钮可以直接生成表单，或复制表单名称后输入"下载[表单名称]"。\n\n`;
        formContent += `**🚀 快速生成（点击即可）：**\n\n`;

        Object.keys(formsByProject).sort().forEach(project => {
          formContent += `**【${project}】**\n`;
          formsByProject[project].forEach(form => {
            formContent += `📄 [${form.template_name}](#form:${form.template_id})\n`;
          });
        });

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: formContent,
          isFormList: true,
          forms: forms,
          extraInfo: '💡 提示：点击表单名称可自动复制到输入框'
        }]);
        return;
      }

      console.log('获取表单列表失败，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      console.error('❌ 表单查询失败:', error);
      message.warning('表单查询服务暂时不可用，正在使用AI助手为您回答...');

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

      const response = await axios.post('/api/forms/generate',
        { templateName: question },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success && response.data.data) {
        const { fileName, downloadUrl, templateName } = response.data.data;

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

      console.log('表单生成失败，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      console.error('❌ 表单生成失败:', error);

      message.warning('表单生成服务暂时不可用，正在使用AI助手为您回答...');

      setMessages(prev => [...prev, {
        role: 'system',
        content: '📄 表单生成服务暂时不可用，正在使用AI助手为您回答...',
        timestamp: new Date().toISOString()
      }]);

      await handleChatQuery(question);
    }
  };

  /**
   * 处理文档问答（基于多政策文档）
   */
  const handleDocumentQuery = async (question) => {
    console.log('📚 [多文档RAG] 开始处理文档问答:', question);
    try {
      // ✨ 新增：准备documentIds参数
      let documentIds = null;
      if (selectedDocumentId !== 'all') {
        documentIds = [selectedDocumentId];
        console.log('🎯 限定文档:', selectedDocumentId);
      }

      const response = await axios.post(
        '/api/rag-v2/answer',  // ✨ 切换到多文档API
        {
          question: question,
          documentIds  // ✨ 新增：传递文档过滤参数
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success && response.data.data) {
        const ragData = response.data.data;

        const notFoundKeywords = [
          '没有找到', '未找到', '抱歉', '对不起',
          '建议您检查问题表述', '查阅学生手册纸质版',
          '我在已索引的政策文档中没有找到'
        ];

        const isNotFound = ragData.answer && notFoundKeywords.some(keyword =>
          ragData.answer.includes(keyword)
        );

        if (isNotFound || (ragData.sources && ragData.sources.length === 0)) {
          console.log('📚 [多文档RAG] 未找到相关文档，降级到普通聊天');

          message.info('📚 已索引的政策文档中没有找到完全匹配的信息，正在使用AI助手为您解答...');

          setMessages(prev => [...prev, {
            role: 'system',
            content: '📚 已索引的政策文档中没有找到完全匹配的信息，正在使用AI助手为您解答...',
            timestamp: new Date().toISOString()
          }]);

          await handleChatQuery(question);
          return;
        }

        let ragContent = ragData.answer;

        // ✨ 处理多文档来源格式
        const sources = ragData.sources || [];
        const formattedSources = [];

        sources.forEach(docGroup => {
          if (docGroup.chunks && docGroup.chunks.length > 0) {
            docGroup.chunks.forEach(chunk => {
              formattedSources.push({
                page: chunk.page,
                score: chunk.score,
                text: chunk.text,      // 完整文本，用于点击查看
                preview: chunk.preview,  // 预览文本，用于列表显示
                documentName: docGroup.documentName
              });
            });
          }
        });

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: ragContent,
          isRAGAnswer: true,
          sources: formattedSources,  // ✨ 使用格式化后的来源
          confidence: ragData.confidence
        }]);
        return;
      }

      console.log('📚 [RAG] 返回成功但没有数据，回退到普通聊天');
      await handleChatQuery(question);

    } catch (error) {
      console.error('❌ RAG文档问答失败:', error);

      message.warning('文档查询服务暂时不可用，正在使用AI助手为您回答...');

      setMessages(prev => [...prev, {
        role: 'system',
        content: '📚 文档查询服务暂时不可用，正在使用AI助手为您回答...',
        timestamp: new Date().toISOString()
      }]);

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
            const downloadUrl = parsed.downloadUrl;
            const fileName = parsed.fileName;
            const templateName = parsed.templateName;

            if (!downloadUrl || !downloadUrl.startsWith('/api/')) {
              console.error('❌ 无效的表单下载URL:', downloadUrl);
              message.error('表单下载链接无效，请联系管理员');
              return;
            }

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
      throw error;
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

  // 当收到选中的历史记录时，加载到消息列表
  useEffect(() => {
    if (selectedHistory) {
      setMessages(selectedHistory);
    }
  }, [selectedHistory]);

  return (
    <div className="chat-page">

      {/* 头部 */}
      <div className="chat-header">
        <div className="header-left">
          <Badge count={chatHistory.length} showZero={false}>
            <Button
              icon={<HistoryOutlined />}
              onClick={onHistoryOpen}
            >
              历史记录
            </Button>
          </Badge>
          <div className="header-title">
            <h2>🤖 内江师院智能助手</h2>
            <p>欢迎，{user.name}！</p>
          </div>
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={onFullscreenToggle}
            className="fullscreen-btn"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          />
        </div>
      </div>

      {/* 消息区域 */}
      <div
        ref={messagesContainerRef}
        className="chat-messages"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="welcome-icon">
              🤖
            </div>
            <h3>👋 您好！我是小智</h3>
            <p>您的智能学习助手，随时为您服务~</p>

            <div className="welcome-features">
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>查询成绩、课程、个人信息</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📥</span>
                <span>下载各类表格和表单</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📚</span>
                <span>查询学生手册和政策</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💬</span>
                <span>聊天解闷，提供建议</span>
              </div>
            </div>

            <div className="welcome-examples">
              <p className="examples-title">💡 试试问我：</p>
              <div className="example-chips">
                <button onClick={() => setInput('你好')} className="example-chip">你好</button>
                <button onClick={() => setInput('我的成绩')} className="example-chip">我的成绩</button>
                <button onClick={() => setInput('课程表')} className="example-chip">课程表</button>
                <button onClick={() => setInput('最近压力大')} className="example-chip">最近压力大</button>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message-row ${msg.role}`}>
            {msg.role === 'user' ? (
              <>
                <div className="message-bubble user">
                  <div className="message-content">
                    {msg.content}
                  </div>
                </div>
                <div className="message-avatar user">
                  <UserOutlined />
                </div>
              </>
            ) : (
              <>
                <div className="message-avatar assistant">
                  {getAIIcon(msg)}
                </div>
                <div className="message-bubble assistant">
                  {/* 消息操作按钮 */}
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'copy',
                          icon: <CopyOutlined />,
                          label: '复制',
                          onClick: () => handleMessageAction('copy', index)
                        },
                        {
                          key: 'regenerate',
                          icon: <ReloadOutlined />,
                          label: '重新生成',
                          onClick: () => handleMessageAction('regenerate', index)
                        },
                        {
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          label: '删除',
                          onClick: () => handleMessageAction('delete', index)
                        }
                      ]
                    }}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      size="small"
                      className="message-action-btn"
                    >
                      ⋯
                    </Button>
                  </Dropdown>

                  <div className="message-content">
                    {msg.isFormList ? (
                      <FormList
                        content={msg.content}
                        forms={msg.forms || []}
                        onCopyFormName={(text) => {
                          setInput(text);
                          message.success('✅ 已复制到输入框，点击发送即可生成表单！');
                        }}
                      />
                    ) : msg.isFormDownload ? (
                      <div>
                        <Markdown>{msg.content}</Markdown>
                        <button
                          onClick={() => handleFormDownload(msg.downloadUrl, msg.fileName)}
                          className="action-button"
                        >
                          📥 点击下载表单文件
                        </button>
                      </div>
                    ) : msg.isDownload ? (
                      <div>
                        <p>{msg.content}</p>
                        <button
                          onClick={() => handleDownload(msg.downloadUrl, msg.downloadType)}
                          className="action-button"
                        >
                          📥 点击下载 {msg.downloadType}
                        </button>
                      </div>
                    ) : msg.isIntelligentQuery ? (
                      <div className="query-result">
                        <Markdown>{msg.content}</Markdown>

                        {msg.queryData && msg.queryData.length > 0 && (
                          <QueryResultTable
                            data={msg.queryData}
                            rowCount={msg.rowCount}
                            downloadUrl={msg.downloadUrl}
                          />
                        )}

                        {msg.downloadUrl && (!msg.queryData || msg.queryData.length === 0) && (
                          <button
                            onClick={() => handleDownload(msg.downloadUrl, '查询结果')}
                            className="action-button"
                          >
                            📥 点击下载查询结果
                          </button>
                        )}

                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="suggestions">
                            <Divider style={{ margin: '12px 0' }} />
                            <div className="suggestions-title">
                              <BulbOutlined style={{ color: '#faad14' }} />
                              <span>后续查询建议：</span>
                            </div>
                            {msg.suggestions.map((suggestion, idx) => (
                              <div
                                key={idx}
                                className="suggestion-chip"
                                onClick={() => setInput(suggestion)}
                              >
                                💡 {suggestion}
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.explanation && (
                          <div className="explanation">
                            <strong>💡 查询说明：</strong>{msg.explanation}
                          </div>
                        )}
                      </div>
                    ) : msg.isRAGAnswer ? (
                      <div className="rag-result">
                        {msg.confidence && (
                          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                            📊 检索置信度: {(msg.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                        <Markdown>{msg.content}</Markdown>

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="rag-sources">
                            <Divider style={{ margin: '12px 0' }} />
                            <div className="sources-header">
                              <BookOutlined style={{ color: '#FF66AB' }} />
                              <span>📖 参考来源：</span>
                              <span className="sources-count">共 {msg.sources.length} 条</span>
                              {msg.confidence && (
                                <span style={{ color: msg.confidence >= 0.5 ? '#52c41a' : '#faad14', marginLeft: '8px' }}>
                                  ({msg.confidence >= 0.5 ? '✅ 高置信度' : '⚠️ 低置信度'})
                                </span>
                              )}
                            </div>

                            {(() => {
                              const currentPage = sourcesPageMap[index] || 1;
                              const totalPages = Math.ceil(msg.sources.length / SOURCES_PER_PAGE);
                              const startIndex = (currentPage - 1) * SOURCES_PER_PAGE;
                              const endIndex = startIndex + SOURCES_PER_PAGE;
                              const currentSources = msg.sources.slice(startIndex, endIndex);

                              return (
                                <>
                                  {currentSources.map((source, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setSelectedPageNum(source.page);
                                        setSelectedSourceContent(source.text);  // 完整文本
                                        setSelectedDocumentName(source.documentName);
                                        setHandbookModalVisible(true);
                                      }}
                                      className="source-item"
                                    >
                                      <div className="source-header">
                                        <BookOutlined />
                                        <span className="source-title">
                                          {source.documentName || '未知文档'}
                                        </span>
                                        <span className="source-page">第{source.page}页</span>
                                      </div>
                                      <div className="source-preview">
                                        {source.preview || source.text?.substring(0, 200)}
                                      </div>
                                      <span className="source-action">点击查看完整内容 →</span>
                                    </div>
                                  ))}

                                  {totalPages > 1 && (
                                    <div className="sources-pagination">
                                      <Button
                                        size="small"
                                        disabled={currentPage === 1}
                                        onClick={() => {
                                          setSourcesPageMap(prev => ({
                                            ...prev,
                                            [index]: currentPage - 1
                                          }));
                                        }}
                                      >
                                        上一页
                                      </Button>

                                      <span>第 {currentPage} / {totalPages} 页</span>

                                      <Button
                                        size="small"
                                        disabled={currentPage === totalPages}
                                        onClick={() => {
                                          setSourcesPageMap(prev => ({
                                            ...prev,
                                            [index]: currentPage + 1
                                          }));
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

                        {msg.confidence && (
                          <div className="confidence">
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
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="message-avatar assistant">
              <Spin size="small" />
            </div>
            <div className="message-bubble assistant">
              <div className="message-content loading">
                正在思考中...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 回到底部按钮 */}
      {showScrollButton && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<VerticalAlignBottomOutlined style={{ fontSize: '20px' }} />}
          onClick={() => scrollToBottom(true)}
          className="scroll-to-bottom-btn"
          title="回到底部"
        />
      )}

      {/* 输入区域 */}
      <div className="chat-input-area">
        {/* ✨ 新增：文档选择器 */}
        {availableDocuments.length > 0 && (
          <div className="document-selector" style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--osu-dark-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
            <BookOutlined style={{ marginRight: '8px', color: '#FF66AB' }} />
            <span style={{ marginRight: '12px', fontWeight: 500, color: '#ffffff' }}>选择文档：</span>
            <Select
              value={selectedDocumentId}
              onChange={(value) => {
                setSelectedDocumentId(value);
                message.info(value === 'all' ? '已切换到全部文档' : `已切换到：${availableDocuments.find(d => d.documentId === value)?.displayName || value}`);
              }}
              style={{ width: 280 }}
              options={[
                { value: 'all', label: '📚 全部文档' },
                ...availableDocuments.map(doc => ({
                  value: doc.documentId,
                  label: `📄 ${doc.displayName || doc.name}`
                }))
              ]}
            />
            {selectedDocumentId !== 'all' && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#b8b8d0' }}>
                仅检索：{availableDocuments.find(d => d.documentId === selectedDocumentId)?.displayName || selectedDocumentId}
              </span>
            )}
          </div>
        )}

        <div className="input-container">
          <Input.TextArea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setMultiline(e.target.value.split('\n').length > 1 || e.target.value.length > 50);
            }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入您的问题...（Enter发送，Shift+Enter换行）"
            autoSize={{ minRows: 1, maxRows: 6 }}
            className="chat-input"
            disabled={loading}
            style={{ fontSize: '13px' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            className="send-button"
          >
            发送
          </Button>
        </div>
      </div>

      {/* 学生手册查看器 */}
      <HandbookViewer
        visible={handbookModalVisible}
        onClose={() => {
          setHandbookModalVisible(false);
          setSelectedSourceContent(null);
          setSelectedDocumentName(null);
        }}
        pageNum={selectedPageNum}
        preloadContent={selectedSourceContent}
        documentName={selectedDocumentName}
      />
    </div>
  );
}

export default Chat;
