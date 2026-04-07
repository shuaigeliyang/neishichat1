/**
 * 学生仪表板
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, message, Descriptions, Space, Dropdown } from 'antd';
import { UserOutlined, BookOutlined, TrophyOutlined, FileTextOutlined, CommentOutlined, DownloadOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';

function StudentDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('学生仪表板加载，用户信息:', user);
    if (user && user.id) {
      console.log('开始获取数据...');
      fetchProfile();
      fetchGrades();
      fetchCourses();
    } else {
      console.warn('用户信息不完整:', user);
      message.warning('用户登录信息不完整，请重新登录');
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/students/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        console.log('个人信息数据:', response.data.data);
        setProfile(response.data.data);
      }
    } catch (error) {
      console.error('获取个人信息错误:', error);
      message.error('获取个人信息失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await axios.get('/api/students/grades', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        const gradesData = response.data.data;

        // 数据去重：按grade_id去重
        const uniqueGrades = Array.from(
          new Map(gradesData.map(g => [g.grade_id, g])).values()
        );

        // 检测并警告重复数据
        if (uniqueGrades.length !== gradesData.length) {
          console.warn(`检测到 ${gradesData.length - uniqueGrades.length} 条重复成绩记录，已自动去重`);
        }

        console.log('成绩数据:', uniqueGrades.length, '条');
        setGrades(uniqueGrades);
      }
    } catch (error) {
      console.error('获取成绩错误:', error);
      message.error('获取成绩失败');
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/students/timetable', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        const coursesData = response.data.data;

        // 数据去重：按offering_id去重
        const uniqueCourses = Array.from(
          new Map(coursesData.map(c => [c.offering_id, c])).values()
        );

        // 检测并警告重复数据
        if (uniqueCourses.length !== coursesData.length) {
          console.warn(`检测到 ${coursesData.length - uniqueCourses.length} 条重复课程记录，已自动去重`);
        }

        console.log('课程数据:', uniqueCourses.length, '门');
        setCourses(uniqueCourses);
      }
    } catch (error) {
      console.error('获取课程表错误:', error);
      message.error('获取课程表失败');
    }
  };

  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      let url = '';

      switch (type) {
        case 'profile':
          url = '/api/export/student/profile';
          break;
        case 'grades':
          url = '/api/export/student/grades';
          break;
        case 'class':
          url = `/api/export/class/${profile.class_id}`;
          break;
        case 'college':
          // 需要从profile中获取college_id
          url = `/api/export/college/${profile.college_id || 1}`;
          break;
        default:
          return;
      }

      message.loading('正在生成Excel文件...', 0);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      message.destroy();

      // 创建下载链接
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;

      // 设置文件名
      const filename = type === 'profile' ? '个人信息.xlsx' :
                      type === 'grades' ? '成绩单.xlsx' :
                      type === 'class' ? '班级信息.xlsx' : '学院信息.xlsx';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      message.success('导出成功！');
    } catch (error) {
      message.destroy();
      message.error('导出失败：' + (error.response?.data?.message || error.message));
    }
  };

  const downloadMenuItems = [
    {
      key: 'profile',
      label: '导出个人信息',
      icon: <UserOutlined />
    },
    {
      key: 'grades',
      label: '导出成绩单',
      icon: <TrophyOutlined />
    },
    {
      key: 'class',
      label: '导出班级信息',
      icon: <TeamOutlined />
    },
    {
      key: 'college',
      label: '导出学院信息',
      icon: <BankOutlined />
    }
  ];

  const gradeColumns = [
    { title: '课程名称', dataIndex: 'course_name', key: 'course_name' },
    { title: '课程代码', dataIndex: 'course_code', key: 'course_code' },
    { title: '学分', dataIndex: 'credits', key: 'credits' },
    {
      title: '成绩',
      dataIndex: 'total_score',
      key: 'total_score',
      render: (score) => {
        let color = 'default';
        if (score >= 90) color = 'success';
        else if (score >= 80) color = 'processing';
        else if (score >= 60) color = 'warning';
        else color = 'error';
        return <Tag color={color}>{score}分</Tag>;
      }
    },
    { title: '学期', dataIndex: 'semester', key: 'semester' },
    { title: '授课教师', dataIndex: 'teacher_name', key: 'teacher_name' }
  ];

  const courseColumns = [
    { title: '课程名称', dataIndex: 'course_name', key: 'course_name' },
    { title: '课程代码', dataIndex: 'course_code', key: 'course_code' },
    { title: '学分', dataIndex: 'credits', key: 'credits' },
    { title: '课程类型', dataIndex: 'course_type', key: 'course_type', render: (type) => <Tag>{type}</Tag> },
    { title: '授课教师', dataIndex: 'teacher_name', key: 'teacher_name' },
    { title: '上课时间', dataIndex: 'schedule', key: 'schedule' },
    { title: '上课地点', dataIndex: 'classroom', key: 'classroom' }
  ];

  if (!profile) {
    return <div style={{ textAlign: 'center', padding: '100px' }}>加载中...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>学生管理系统</h1>
          <p>欢迎，{profile.name}同学！</p>
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
          <Dropdown
            menu={{
              items: downloadMenuItems,
              onClick: ({ key }) => handleExport(key)
            }}
          >
            <Button size="large" icon={<DownloadOutlined />}>
              导出数据
            </Button>
          </Dropdown>
          <Button size="large" onClick={onLogout}>退出登录</Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card loading={!profile}>
            <Statistic
              title="总课程数"
              value={grades && grades.length > 0 ? grades.length : 0}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={!profile}>
            <Statistic
              title="平均分"
              value={(() => {
                if (!grades || grades.length === 0) return 0;
                const validGrades = grades.filter(g => g.total_score !== null && g.total_score !== undefined);
                if (validGrades.length === 0) return 0;
                const sum = validGrades.reduce((acc, g) => acc + Number(g.total_score || 0), 0);
                return (sum / validGrades.length).toFixed(1);
              })()}
              suffix="分"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={!profile}>
            <Statistic
              title="本学期课程"
              value={courses && courses.length > 0 ? courses.filter(c => c.semester === '2024-2025-1').length : 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#f093fb' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={!profile}>
            <Statistic
              title="成绩总分"
              value={(() => {
                if (!grades || grades.length === 0) return 0;
                return grades.reduce((sum, g) => sum + (Number(g.total_score) || 0), 0);
              })()}
              suffix="分"
              prefix={<UserOutlined />}
              valueStyle={{ color: '#4facfe' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="个人信息" style={{ marginTop: 16 }} loading={!profile}>
        <Descriptions column={3} bordered>
          <Descriptions.Item label="姓名">{profile?.name || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="学号">{profile?.student_code || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="性别">{profile?.gender || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="学院">{profile?.college_name || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="专业">{profile?.major_name || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="班级">{profile?.class_name || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="政治面貌">{profile?.political_status || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="民族">{profile?.nation || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="学籍状态">
            {profile?.status ? <Tag color="success">{profile.status}</Tag> : '未填写'}
          </Descriptions.Item>
          <Descriptions.Item label="联系电话">{profile?.phone || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{profile?.email || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="入学日期">
            {profile?.enrollment_date ? new Date(profile.enrollment_date).toLocaleDateString() : '未填写'}
          </Descriptions.Item>
          <Descriptions.Item label="宿舍">{profile?.dormitory || '未填写'}</Descriptions.Item>
          <Descriptions.Item label="学制">{profile?.duration ? profile.duration + '年' : '未填写'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="我的成绩" style={{ marginTop: 16 }}>
        <Table
          columns={gradeColumns}
          dataSource={grades}
          rowKey="grade_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card title="课程表" style={{ marginTop: 16, marginBottom: 16 }}>
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

export default StudentDashboard;
