/**
 * 表单列表组件 - 支持点击复制
 * 设计师：哈雷酱大小姐 (￣▽▽)ﾉ
 */
import React from 'react';
import { List, Typography, Divider, Button, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

function FormList({ content, forms, onCopyFormName }) {
  // 按项目分组
  const formsByProject = forms.reduce((acc, form) => {
    const project = form.project_name || '其他';
    if (!acc[project]) {
      acc[project] = [];
    }
    acc[project].push(form);
    return acc;
  }, {});

  const handleCopy = (templateName) => {
    const text = `下载${templateName}`;
    navigator.clipboard.writeText(text).then(() => {
      message.success(`✅ 已复制：${text}`);
      if (onCopyFormName) {
        onCopyFormName(text);
      }
    });
  };

  return (
    <div style={{ padding: '16px' }}>
      <Paragraph>
        <Text strong>📝 系统可下载的表单列表</Text>
      </Paragraph>
      <Paragraph type="secondary">
        📁 按项目分类（与实际目录完全对齐）- 共 {forms.length} 个表单
      </Paragraph>

      <Divider />

      {Object.keys(formsByProject).sort().map((project, idx) => (
        <div key={idx} style={{ marginBottom: 24 }}>
          <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
            【{project}】
          </Text>
          <List
            size="small"
            dataSource={formsByProject[project]}
            renderItem={(form) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy(form.template_name)}
                    size="small"
                  >
                    复制
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Text code style={{ fontSize: 13 }}>
                      {form.template_name}
                    </Text>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {form.description}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      ))}

      <Divider />

      <Paragraph>
        <Text strong>💡 使用提示：</Text>
      </Paragraph>
      <Paragraph>
        <ul>
          <li>点击"复制"按钮，自动复制"下载[表单名称]"到剪贴板</li>
          <li>粘贴到输入框发送即可生成表单</li>
          <li>表单名称与数据库完全一致，确保识别准确</li>
        </ul>
      </Paragraph>
    </div>
  );
}

export default FormList;
