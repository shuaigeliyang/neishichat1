/**
 * 学生手册查看器组件
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：显示学生手册指定页面的完整内容
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin, Alert, Typography, Divider, Tag } from 'antd';
import { BookOutlined, FileTextOutlined, LoadingOutlined } from '@ant-design/icons';
import axios from 'axios';
import './HandbookViewer.css';

const { Title, Paragraph, Text } = Typography;

function HandbookViewer({ visible, onClose, pageNum }) {
  const [loading, setLoading] = useState(false);
  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && pageNum) {
      fetchPageContent();
    }
  }, [visible, pageNum]);

  const fetchPageContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/handbook/page/${pageNum}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success && response.data.data) {
        setPageData(response.data.data);
      } else {
        setError('获取页面内容失败');
      }
    } catch (err) {
      console.error('获取手册页面失败：', err);
      setError(err.response?.data?.message || '获取页面内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化文本内容（保留换行和结构）
  const formatText = (text) => {
    if (!text) return '';

    // 按行分割
    const lines = text.split('\n');

    return lines.map((line, index) => {
      // 跳过空行
      if (!line.trim()) {
        return <br key={index} />;
      }

      // 检测是否是标题（包含"第"、"章"、"节"、"一、"等）
      const isTitle = /^(第[一二三四五六七八九十百零千]+[章节]|^[一二三四五六七八九十]+、|第\d+页)/.test(line.trim());

      // 检测是否是条款（包含"第X条"）
      const isArticle = /^第[一二三四五六七八九十百零千]+条/.test(line.trim());

      if (isTitle) {
        return (
          <Title key={index} level={4} style={{ marginTop: '16px', color: '#1890ff' }}>
            {line}
          </Title>
        );
      }

      if (isArticle) {
        return (
          <Paragraph key={index} strong style={{ marginTop: '8px', color: '#52c41a' }}>
            <Tag color="green">条款</Tag> {line}
          </Paragraph>
        );
      }

      return (
        <Paragraph key={index} style={{ marginBottom: '8px', textAlign: 'justify' }}>
          {line}
        </Paragraph>
      );
    });
  };

  return (
    <Modal
      title={
        <span>
          <BookOutlined style={{ marginRight: '8px' }} />
          学生手册 - 第{pageNum}页
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose} type="primary">
          关闭
        </Button>
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <div style={{ marginTop: '16px' }}>正在加载页面内容...</div>
        </div>
      ) : error ? (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          icon={<FileTextOutlined />}
        />
      ) : pageData ? (
        <div className="handbook-content">
          <div style={{ marginBottom: '16px' }}>
            <Tag color="blue">页码：{pageData.page_num}</Tag>
            <Tag color="purple">总页数：{pageData.total_pages}</Tag>
          </div>

          <Divider />

          <div className="handbook-text">
            {formatText(pageData.text)}
          </div>

          <Divider />

          <div style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>
            <FileTextOutlined style={{ marginRight: '4px' }} />
            以上内容来自《学生手册》第{pageNum}页
          </div>
        </div>
      ) : (
        <Alert
          message="无内容"
          description="该页面没有可显示的内容"
          type="info"
          showIcon
        />
      )}
    </Modal>
  );
}

export default HandbookViewer;
