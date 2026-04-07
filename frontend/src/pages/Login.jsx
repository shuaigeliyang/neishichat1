/**
 * 登录页面
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Login.css';

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', values);

      if (response.data.success) {
        message.success('登录成功！');
        onLogin(response.data.data);
      } else {
        message.error(response.data.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <h1>学生教育系统智能体</h1>
          <p>由内师智能体系统打造 (￣▽￣)ﾉ</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名/学号/工号' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名/学号/工号"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="login-tips">
          <p>测试账号：</p>
          <p>学生：S2201001 ~ S2406030</p>
          <p>教师：T01001 ~ T05100</p>
          <p>管理员：admin</p>
          <p>默认密码：123456</p>
        </div>
      </Card>
    </div>
  );
}

export default Login;
