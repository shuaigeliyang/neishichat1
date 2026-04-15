/**
 * 历史记录侧边栏组件 - 独立于聊天界面
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect } from 'react';
import { Button, Badge, message } from 'antd';
import { CloseOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from 'axios';
import '../pages/Chat.css';

function HistorySidebar({ visible, onClose, onSelectHistory, user }) {
  const [chatHistory, setChatHistory] = useState([]);

  // 获取聊天历史记录
  useEffect(() => {
    if (user) {
      fetchChatHistory();
    }
  }, [user, visible]);

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/chat/history?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const history = response.data.data || [];
      if (history.length === 0) {
        message.info('暂无历史记录');
      }
      setChatHistory(history);
    } catch (error) {
      console.error('获取历史记录失败:', error);
      message.error('获取历史记录失败');
    }
  };

  const handleSelectHistory = (item) => {
    if (onSelectHistory) {
      onSelectHistory([
        { role: 'user', content: item.user_question },
        { role: 'assistant', content: item.ai_answer_preview || item.ai_answer }
      ]);
    }
    onClose();
    message.success('已加载历史对话');
  };

  return (
    <div className={`chat-sidebar ${visible ? 'visible' : ''}`}>
      <div className="sidebar-header">
        <h3>📜 历史记录</h3>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          className="close-sidebar-btn"
        />
      </div>

      <div className="sidebar-content">
        {chatHistory.length === 0 ? (
          <div className="empty-history">
            <p>暂无历史记录</p>
            <p className="hint">开始对话后，记录会保存在这里</p>
          </div>
        ) : (
          chatHistory.map((item) => (
            <div
              key={item.chat_id}
              className="history-item"
              onClick={() => handleSelectHistory(item)}
            >
              <div className="history-item-question">
                {item.user_question}
              </div>
              <div className="history-item-meta">
                <span className="time">
                  {new Date(item.created_at).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="intent">
                  {item.intent === 'chat' ? '💬 闲聊' :
                   item.intent === 'download' ? '📥 下载' : '📊 查询'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default HistorySidebar;