/**
 * 管理员仪表板
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, message, Tabs } from 'antd';
import { UserOutlined, TeamOutlined, BookOutlined, FileTextOutlined, CommentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [regulations, setRegulations] = useState([]);
  const [forms, setForms] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    // 只在用户是管理员时才加载数据
    if (user && user.type === 'admin') {
      fetchStats();
      fetchRegulations();
      fetchForms();
      fetchChatHistory();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/statistics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      message.error('获取统计信息失败');
    }
  };

  const fetchRegulations = async () => {
    try {
      const response = await axios.get('/api/regulations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setRegulations(response.data.data);
      }
    } catch (error) {
      message.error('获取管理办法失败');
    }
  };

  const fetchForms = async () => {
    try {
      const response = await axios.get('/api/forms', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setForms(response.data.data);
      }
    } catch (error) {
      message.error('获取表格列表失败');
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get('/api/admin/chat-history?limit=20', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setChatHistory(response.data.data);
      }
    } catch (error) {
      console.error('获取对话历史失败');
    }
  };

  const regulationColumns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '版本', dataIndex: 'version', key: 'version' },
    { title: '生效日期', dataIndex: 'effective_date', key: 'effective_date' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status) => <span>{status}</span> },
    { title: '浏览次数', dataIndex: 'view_count', key: 'view_count' }
  ];

  const formColumns = [
    { title: '表格名称', dataIndex: 'form_name', key: 'form_name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '适用对象', dataIndex: 'target_user', key: 'target_user' },
    { title: '下载次数', dataIndex: 'download_count', key: 'download_count' }
  ];

  const chatColumns = [
    { title: '用户类型', dataIndex: 'user_type', key: 'user_type' },
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '问题', dataIndex: 'user_question', key: 'user_question', ellipsis: true },
    { title: '意图', dataIndex: 'intent', key: 'intent' },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (time) => new Date(time).toLocaleString() }
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: 20, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>管理员控制台</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: 14 }}>欢迎，系统管理员！</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button type="primary" size="large" icon={<CommentOutlined />} onClick={() => navigate('/chat')}>智能助手</Button>
          <Button size="large" onClick={onLogout}>退出登录</Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="学院" value={stats.colleges || 0} prefix={<UserOutlined />} valueStyle={{ color: '#667eea' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="专业" value={stats.majors || 0} valueStyle={{ color: '#764ba2' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="班级" value={stats.classes || 0} valueStyle={{ color: '#f093fb' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="学生" value={stats.students || 0} prefix={<TeamOutlined />} valueStyle={{ color: '#4facfe' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="教师" value={stats.teachers || 0} valueStyle={{ color: '#43e97b' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="课程" value={stats.courses || 0} prefix={<BookOutlined />} valueStyle={{ color: '#fa709a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="管理办法" value={stats.regulations || 0} prefix={<FileTextOutlined />} valueStyle={{ color: '#feca57' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总数据量" value={Object.values(stats).reduce((a, b) => a + (b || 0), 0)} valueStyle={{ color: '#ff6b6b' }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: '1',
              label: '管理办法',
              children: (
                <Table
                  columns={regulationColumns}
                  dataSource={regulations}
                  rowKey="regulation_id"
                  pagination={{ pageSize: 10 }}
                />
              )
            },
            {
              key: '2',
              label: '可下载表格',
              children: (
                <Table
                  columns={formColumns}
                  dataSource={forms}
                  rowKey="form_id"
                  pagination={{ pageSize: 10 }}
                />
              )
            },
            {
              key: '3',
              label: '对话历史',
              children: (
                <Table
                  columns={chatColumns}
                  dataSource={chatHistory}
                  rowKey="chat_id"
                  pagination={{ pageSize: 10 }}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}

export default AdminDashboard;
