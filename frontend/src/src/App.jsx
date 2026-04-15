/**
 * 主应用组件
 * @author 哈雷酱大小姐 (￣▽￣)ﾉ
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, theme } from 'antd';
import Login from './pages/Login';
import Chat from './pages/Chat';
import SchoolPortal from './pages/SchoolPortal';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';

const { Content } = Layout;

// osu! 风格 Ant Design 主题配置
const osuTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#FF66AB',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f6f7fb',
    colorText: '#1f2430',
    colorTextSecondary: '#5b6270',
    colorBorder: 'rgba(31, 36, 48, 0.10)',
    colorBorderSecondary: 'rgba(31, 36, 48, 0.10)',
    borderRadius: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  components: {
    Button: {
      primaryShadow: '0 10px 30px rgba(255, 102, 171, 0.25)',
      defaultBg: 'rgba(255, 255, 255, 0.75)',
      defaultBorderColor: 'rgba(31, 36, 48, 0.10)',
    },
    Input: {
      activeBorderColor: '#FF66AB',
      hoverBorderColor: '#FF66AB',
    },
    Card: {
      colorBgContainer: '#ffffff',
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: 'linear-gradient(135deg, #FF66AB 0%, #9B4DCA 100%)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(255, 102, 171, 0.1)',
    },
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从localStorage获取用户信息
    const userInfo = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userInfo && token) {
      const parsedUser = JSON.parse(userInfo);
      console.log('恢复用户信息:', parsedUser);
      setUser(parsedUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    // userData包含 { token, user: {...} }
    // 我们直接存储userData.user，但保留token在localStorage中
    setUser(userData.user);
    localStorage.setItem('user', JSON.stringify(userData.user));
    localStorage.setItem('token', userData.token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (loading) {
    return (
      <div className="loading-container osu-glow">
        <div style={{ fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(135deg, #FF66AB 0%, #9B4DCA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider theme={osuTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <div className="osu-background" />
        <Content style={{ padding: '0', background: 'transparent' }}>
          <Routes>
            <Route
              path="/"
              element={<SchoolPortal />}
            />
            <Route
              path="/login"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/dashboard"
              element={user ? (
                user.type === 'student' ? (
                  <StudentDashboard user={user} onLogout={handleLogout} />
                ) : user.type === 'teacher' ? (
                  <TeacherDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                )
              ) : (
                <Navigate to="/" replace />
              )}
            />
            <Route
              path="/chat"
              element={user ? <Chat user={user} /> : <Navigate to="/" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
