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

function FloatChat({ visible, onClose, isFullscreen, onFullscreenToggle, user, onLoginRequest }) {
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
      width={isFullscreen ? '100vw' : 375}
      style={{ top: isFullscreen ? 0 : 20 }}
      bodyStyle={{
        height: isFullscreen ? '100vh' : 667,
        padding: 0,
        borderRadius: isFullscreen ? 0 : '15px',
        overflow: 'hidden'
      }}
      className="float-chat-modal"
      centered={!isFullscreen}
      maskClosable={true}
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className={`float-chat-container ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* 聊天头部 */}
        <div className="float-chat-header">
          <div className="header-left">
            <span className="chat-avatar">🤖</span>
            <div className="chat-title">
              <h3>内江师院智能助手</h3>
              <p>{isGuestMode ? '访客模式' : `欢迎，${user.name}`}</p>
            </div>
          </div>

          <div className="header-right">
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={handleFullscreenToggle}
              className="header-btn"
              title={isFullscreen ? '退出全屏' : '全屏显示'}
            />
            {isGuestMode && (
              <Button
                type="primary"
                size="small"
                icon={<LoginOutlined />}
                onClick={handleLogin}
                className="login-btn"
              >
                登录
              </Button>
            )}
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleClose}
              className="header-btn close-btn"
            />
          </div>
        </div>

        {/* 聊天内容区 */}
        <div className="float-chat-content">
          {isGuestMode ? (
            <GuestChat onLoginRequest={handleLogin} />
          ) : (
            <Chat user={user} />
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
