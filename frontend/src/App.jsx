/**
 * 主应用组件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import Login from './pages/Login';
import Chat from './pages/Chat';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';

const { Content } = Layout;

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
    return <div style={{ textAlign: 'center', padding: '100px', color: '#fff' }}>加载中...</div>;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '0', background: 'transparent' }}>
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />}
          />
          <Route
            path="/"
            element={user ? (
              user.type === 'student' ? (
                <StudentDashboard user={user} onLogout={handleLogout} />
              ) : user.type === 'teacher' ? (
                <TeacherDashboard user={user} onLogout={handleLogout} />
              ) : (
                <AdminDashboard user={user} onLogout={handleLogout} />
              )
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/chat"
            element={user ? <Chat user={user} /> : <Navigate to="/login" />}
          />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;
