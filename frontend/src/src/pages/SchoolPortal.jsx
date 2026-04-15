/**
 * 内江师范学院学校门户页面
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 集成登录功能，支持访客模式和登录模式切换
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Modal, Form, Input, message, Dropdown, Avatar } from 'antd';
import {
  BankOutlined,
  TrophyOutlined,
  BookOutlined,
  TeamOutlined,
  RobotOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SolutionOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined
} from '@ant-design/icons';
import CircularIcon from '../components/CircularIcon';
import FloatChat from '../components/FloatChat';
import axios from 'axios';
import './SchoolPortal.css';

const { Title, Paragraph, Text } = Typography;

function SchoolPortal() {
  const [user, setUser] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // 检查登录状态
  useEffect(() => {
    const userInfo = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userInfo && token) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (error) {
        console.error('解析用户信息失败:', error);
      }
    }
  }, []);

  const handleLoginRequest = () => {
    // 打开登录弹窗
    setLoginModalVisible(true);
  };

  const handleChatOpen = () => {
    setChatVisible(true);
  };

  const handleChatClose = () => {
    setChatVisible(false);
    setIsFullscreen(false);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleLoginClick = () => {
    setLoginModalVisible(true);
  };

  const handleLoginCancel = () => {
    setLoginModalVisible(false);
  };

  const handleLoginSubmit = async (values) => {
    setLoginLoading(true);
    try {
      const response = await axios.post('/api/auth/login', values);

      if (response.data.success) {
        const userData = response.data.data;

        // 保存登录信息
        setUser(userData.user);
        localStorage.setItem('user', JSON.stringify(userData.user));
        localStorage.setItem('token', userData.token);

        message.success('登录成功！欢迎回来~ (￣▽￣)ﾉ');
        setLoginModalVisible(false);

        // 刷新页面以更新状态
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        message.error(response.data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
      message.error('登录失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      onOk: () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        message.success('已退出登录');
        // 刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    });
  };

  // 用户菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => message.info('个人信息功能开发中...')
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true
    }
  ];

  const features = [
    {
      icon: <RobotOutlined style={{ fontSize: '48px', color: '#FF66AB' }} />,
      title: '智能助手',
      description: '24小时在线，解答您的疑问'
    },
    {
      icon: <BarChartOutlined style={{ fontSize: '48px', color: '#FF66AB' }} />,
      title: '成绩查询',
      description: '快速查询学业成绩和学分'
    },
    {
      icon: <FileTextOutlined style={{ fontSize: '48px', color: '#FF66AB' }} />,
      title: '表单下载',
      description: '各类申请表格一键下载'
    },
    {
      icon: <SolutionOutlined style={{ fontSize: '48px', color: '#FF66AB' }} />,
      title: '政策咨询',
      description: '学生手册和政策在线查询'
    }
  ];

  return (
    <div className="school-portal">
      {/* 顶部导航 */}
      <header className="portal-header">
        <div className="school-logo-area">
          <div className="school-logo">内师</div>
          <div className="school-title">
            <Title level={2} style={{ margin: 0 }}>内江师范学院</Title>
            <Text type="secondary">Neijiang Normal University</Text>
          </div>
        </div>

        {/* 右侧登录/用户信息区域 */}
        <div className="header-auth-area">
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#FF66AB' }} />
                <span className="user-name">{user.name}</span>
                <span className="user-type">({user.type === 'student' ? '学生' : user.type === 'teacher' ? '教师' : '管理员'})</span>
              </div>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={handleLoginClick}
              size="large"
              className="login-button"
            >
              登录
            </Button>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <div className="portal-content">
        <Row gutter={[24, 24]}>
          {/* 学校简介 */}
          <Col xs={24} sm={12} lg={12}>
            <Card className="content-card" hoverable>
              <div className="card-icon">
                <BankOutlined style={{ fontSize: '48px', color: '#FF66AB' }} />
              </div>
              <Title level={3}>学校简介</Title>
              <Paragraph className="card-content">
                内江师范学院是四川省人民政府举办的全日制普通本科院校，
                坐落于素有"千年绸都"美誉的内江市。学校创建于1956年，
                历经六十余年的建设与发展，已成为一所以教师教育为主，
                多学科协调发展的综合性师范院校。
              </Paragraph>
            </Card>
          </Col>

          {/* 办学特色 */}
          <Col xs={24} sm={12} lg={12}>
            <Card className="content-card" hoverable>
              <div className="card-icon">
                <TrophyOutlined style={{ fontSize: '48px', color: '#FF99CC' }} />
              </div>
              <Title level={3}>办学特色</Title>
              <ul className="card-content">
                <li>教师教育特色鲜明</li>
                <li>多学科协调发展</li>
                <li>应用型人才培养</li>
                <li>产教融合深度推进</li>
                <li>国际化办学视野</li>
              </ul>
            </Card>
          </Col>

          {/* 专业设置 */}
          <Col xs={24} sm={12} lg={12}>
            <Card className="content-card" hoverable>
              <div className="card-icon">
                <BookOutlined style={{ fontSize: '48px', color: '#B06DD6' }} />
              </div>
              <Title level={3}>专业设置</Title>
              <Paragraph className="card-content">
                学校设有文学院、数学与信息科学学院、外国语学院、化学化工学院、
                音乐学院、美术学院、体育学院、政法与历史学院、管理学院、
                经济与管理学院、教育科学学院、工程技术学院、计算机科学学院等20个二级学院。
              </Paragraph>
            </Card>
          </Col>

          {/* 校园文化 */}
          <Col xs={24} sm={12} lg={12}>
            <Card className="content-card" hoverable>
              <div className="card-icon">
                <TeamOutlined style={{ fontSize: '48px', color: '#9B4DCA' }} />
              </div>
              <Title level={3}>校园文化</Title>
              <ul className="card-content">
                <li><Text strong>校训：</Text>明德博学，笃行创新</li>
                <li><Text strong>校风：</Text>团结、勤奋、求实、创新</li>
                <li><Text strong>教风：</Text>严谨治学，诲人不倦</li>
                <li><Text strong>学风：</Text>勤学善思，知行合一</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 特色功能区 */}
      <section className="features-section">
        <Title level={2} className="section-title">
          ✨ 智能校园服务
        </Title>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={12} sm={12} lg={6} key={index}>
              <Card className="feature-card" hoverable>
                <div className="feature-icon">{feature.icon}</div>
                <Title level={4} className="feature-title">{feature.title}</Title>
                <Text className="feature-desc">{feature.description}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* 底部信息 */}
      <footer className="portal-footer">
        <Paragraph>
          <Text strong>内江师范学院</Text>
        </Paragraph>
        <Paragraph type="secondary">
          地址：四川省内江市东桐路1124号 | 邮编：641100 | 电话：0832-2340666
        </Paragraph>
        <Paragraph type="secondary" style={{ marginTop: '15px' }}>
          © 2024 内江师范学院 | 智能校园系统 (￣▽￣)ﾉ
        </Paragraph>
      </footer>

      {/* 圆形智能体图标 */}
      <CircularIcon onClick={handleChatOpen} />

      {/* 浮窗聊天组件 - 根据登录状态决定是否传用户信息 */}
      <FloatChat
        visible={chatVisible}
        onClose={handleChatClose}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreenToggle}
        user={user}
        onLoginRequest={handleLoginRequest}
      />

      {/* 登录弹窗 */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>🔐 用户登录</Title>
            <Text type="secondary">内江师范学院智能校园系统</Text>
          </div>
        }
        open={loginModalVisible}
        onCancel={handleLoginCancel}
        footer={null}
        width={400}
        centered
      >
        <Form
          name="login"
          onFinish={handleLoginSubmit}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            label="用户名/学号/工号"
            name="username"
            rules={[{ required: true, message: '请输入用户名/学号/工号' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名/学号/工号"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<UserOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginLoading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              测试账号：学生 S2201001 / 教师 T01001 / 管理员 admin
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              默认密码：123456
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default SchoolPortal;
