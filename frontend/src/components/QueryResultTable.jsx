/**
 * 查询结果表格组件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：显示智能查询的结果，支持分页和下载
 */

import React, { useState } from 'react';
import { Table, Tag, Button, Spin } from 'antd';
import { DownloadOutlined, TableOutlined } from '@ant-design/icons';

function QueryResultTable({ data, rowCount, downloadUrl, loading = false }) {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: rowCount
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>正在加载查询结果...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        <p>暂无数据</p>
      </div>
    );
  }

  // 动态生成列
  const columns = Object.keys(data[0]).map(key => ({
    title: key,
    dataIndex: key,
    key: key,
    ellipsis: true,
    width: 150,
    render: (text) => {
      // 处理null/undefined
      if (text === null || text === undefined) {
        return <span style={{ color: '#ccc' }}>-</span>;
      }
      // 处理长文本
      if (typeof text === 'string' && text.length > 50) {
        return <span title={text}>{text.substring(0, 50)}...</span>;
      }
      return <span>{text}</span>;
    }
  }));

  // 处理下载
  const handleDownload = async () => {
    if (!downloadUrl) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `query_result_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败，请稍后重试');
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      {/* 结果头部 */}
      <div style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TableOutlined style={{ fontSize: '18px', color: '#667eea' }} />
          <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
            共 {rowCount} 条记录
          </Tag>
          {data.length < rowCount && (
            <Tag color="orange" style={{ fontSize: '12px' }}>
              显示前 {data.length} 条预览
            </Tag>
          )}
        </div>

        {downloadUrl && (
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            下载完整数据
          </Button>
        )}
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={data}
        pagination={pagination}
        onChange={(newPagination) => setPagination({
          ...newPagination,
          total: rowCount
        })}
        size="small"
        scroll={{ x: 'max-content' }}
        bordered
        rowKey={(record, index) => index}
        style={{
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}

export default QueryResultTable;
