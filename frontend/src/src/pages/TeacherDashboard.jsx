/**
 * 教师仪表板
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, message } from 'antd';
import { UserOutlined, BookOutlined, TeamOutlined, CommentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TeacherDashboard.css';

function TeacherDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchCourses();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/teachers/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error) {
      message.error('获取个人信息失败');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/teachers/courses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      message.error('获取授课课程失败');
    }
  };

  const courseColumns = [
    { title: '课程名称', dataIndex: 'course_name', key: 'course_name' },
    { title: '课程代码', dataIndex: 'course_code', key: 'course_code' },
    { title: '学分', dataIndex: 'credits', key: 'credits' },
    { title: '课程类型', dataIndex: 'course_type', key: 'course_type', render: (type) => <Tag>{type}</Tag> },
    { title: '授课班级', dataIndex: 'class_name', key: 'class_name' },
    { title: '学期', dataIndex: 'semester', key: 'semester' },
    { title: '上课时间', dataIndex: 'schedule', key: 'schedule' },
    { title: '上课地点', dataIndex: 'classroom', key: 'classroom' },
    {
      title: '选课人数',
      dataIndex: 'current_students',
      key: 'current_students',
      render: (count, record) => `${count}/${record.max_students}`
    }
  ];

  if (!profile) {
    return <div style={{ textAlign: 'center', padding: '100px' }}>加载中...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>教师管理系统</h1>
          <p>欢迎，{profile.name}老师！</p>
        </div>
        <div className="dashboard-actions">
          <Button
            type="primary"
            size="large"
            icon={<CommentOutlined />}
            onClick={() => navigate('/chat')}
          >
            智能助手
          </Button>
          <Button size="large" onClick={onLogout}>退出登录</Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title="授课课程数"
              value={courses.length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="授课学生数"
              value={courses.reduce((sum, c) => sum + c.current_students, 0)}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="所属学院"
              value={profile.college_name}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#f093fb', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="我的授课课程" style={{ marginTop: 16 }}>
        <Table
          columns={courseColumns}
          dataSource={courses}
          rowKey="offering_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

export default TeacherDashboard;
