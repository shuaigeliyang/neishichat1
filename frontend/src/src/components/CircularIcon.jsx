/**
 * 圆形智能体图标组件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React from 'react';
import './CircularIcon.css';

function CircularIcon({ onClick, badge = 0 }) {
  return (
    <div
      className="circular-icon"
      onClick={onClick}
      title="点击打开智能助手"
    >
      {/* 呼吸灯效果 */}
      <div className="icon-pulse"></div>

      {/* 图标主体 */}
      <div className="icon-body">
        <span className="icon-emoji">🤖</span>
      </div>

      {/* 消息提示角标 */}
      {badge > 0 && (
        <div className="icon-badge">
          {badge > 99 ? '99+' : badge}
        </div>
      )}

      {/* 提示文字 */}
      <div className="icon-tooltip">
        有问题？点我！
      </div>
    </div>
  );
}

export default CircularIcon;
