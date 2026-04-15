/**
 * 浮窗聊天组件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 根据user属性自动切换：
 * - user为null/undefined：访客模式
 * - user有值：完整功能模式
 */

import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import {
  CloseOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import GuestChat from '../pages/GuestChat';
import Chat from '../pages/Chat';
import './FloatChat.css';

function FloatChat({ visible, onClose, isFullscreen, onFullscreenToggle, user, onLoginRequest, selectedHistory, onHistoryOpen }) {
  const navigate = useNavigate();

  // 判断是否为访客模式
  const isGuestMode = !user;

  const handleLogin = () => {
    // 关闭浮窗，然后触发登录请求回调
    if (onClose) {
      onClose();
    }
    // 延迟一下，让浮窗关闭动画完成
    setTimeout(() => {
      if (onLoginRequest) {
        onLoginRequest();
      }
    }, 300);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleFullscreenToggle = () => {
    if (onFullscreenToggle) {
      onFullscreenToggle();
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      closable={false}
      width={isFullscreen ? '94vw' : 475}
      style={{ top: isFullscreen ? '3vh' : 10 }}
      bodyStyle={{
        height: isFullscreen ? '94vh' : 725,
        padding: 0,
        borderRadius: isFullscreen ? '4px' : 10,
        overflow: 'hidden'
      }}
      className="float-chat-modal"
      centered={!isFullscreen}
      maskClosable={true}
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className={`float-chat-container ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* 聊天内容区 */}
        <div className="float-chat-content">
          {isGuestMode ? (
            <GuestChat 
              onLoginRequest={handleLogin} 
              isFullscreen={isFullscreen} 
              onFullscreenToggle={handleFullscreenToggle} 
            />
          ) : (
            <Chat 
              user={user} 
              isFullscreen={isFullscreen} 
              onFullscreenToggle={handleFullscreenToggle} 
              selectedHistory={selectedHistory}
              onHistoryOpen={onHistoryOpen}
            />
          )}
        </div>

        {/* 访客模式提示 */}
        {isGuestMode && (
          <div className="guest-mode-tip">
            <span className="tip-icon">💡</span>
            <span className="tip-text">
              访客模式仅支持基本问答，登录后可使用完整功能
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default FloatChat;
