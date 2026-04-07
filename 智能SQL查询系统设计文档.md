# 智能SQL查询系统设计文档 🎓

> **设计师：** 内师智能体系统 (￣▽￣)ﾉ
> **难度等级：** ⭐⭐⭐⭐⭐ (五星级挑战！)
> **实现方式：** 混合AI架构（智谱AI + 本地规则引擎）

---

## 🎯 核心功能

### 1. 智能SQL生成引擎
```
用户输入："查询全校学生信息"
    ↓
智谱AI分析意图
    ↓
生成SQL：SELECT * FROM students
    ↓
安全验证
    ↓
执行查询
    ↓
结果评估（记录数 > 100 → 下载，否则显示）
```

### 2. 智能结果处理
- **少量数据**（< 50条）：表格形式直接显示
- **中等数据**（50-500条）：分页显示 + 下载选项
- **大量数据**（> 500条）：自动生成Excel下载链接

### 3. 上下文记忆
```
第一轮："查询计算机专业的学生"
第二轮："他们里面有多少女生？" → 理解"他们"指第一轮的结果
第三轮："下载这些女生的信息" → 知道要下载哪些数据
```

---

## 🏗️ 技术架构

### 架构图
```
┌─────────────────────────────────────────┐
│         前端（React + Ant Design）        │
│  - 智能聊天界面                          │
│  - 表格展示组件                          │
│  - Excel下载按钮                         │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│      后端API（Express + Node.js）         │
│  ┌──────────────────────────────────┐  │
│  │   智能路由层（intelligent.js）    │  │
│  │  - 意图识别                      │  │
│  │  - 上下文管理                    │  │
│  │  - 结果评估                      │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
│  ┌───────────↓──────────────────────┐  │
│  │   SQL生成引擎（sqlGenerator.js）  │  │
│  │  - AI SQL生成                    │  │
│  │  - SQL安全验证                   │  │
│  │  - 查询优化                      │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
│  ┌───────────↓──────────────────────┐  │
│  │   数据库层（database.js）          │  │
│  │  - 执行SQL查询                   │  │
│  │  - 数据处理                      │  │
│  │  - Excel生成                     │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│         智谱AI API（外部服务）            │
│  - SQL生成                              │
│  - 意图理解                             │
│  - 上下文推理                           │
└─────────────────────────────────────────┘
```

---

## 📁 文件结构

### 新增文件
```
backend/
├── src/
│   ├── routes/
│   │   └── intelligent.js          # 智能查询路由（新）
│   ├── services/
│   │   ├── sqlGenerator.js         # SQL生成引擎（新）
│   │   ├── contextManager.js       # 上下文管理器（新）
│   │   └── resultEvaluator.js     # 结果评估器（新）
│   └── middleware/
│       └── sqlValidator.js         # SQL安全验证（新）

frontend/
└── src/
    ├── pages/
    │   └── Chat.jsx                # 增强聊天界面（修改）
    └── components/
        └── QueryResultTable.jsx    # 查询结果表格组件（新）
```

---

## 🔧 核心实现

### 1. SQL生成引擎（sqlGenerator.js）

```javascript
/**
 * SQL生成引擎
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const { chat: zhipuChat } = require('./zhipuAI');

/**
 * 数据库表结构定义（用于AI理解）
 */
const DATABASE_SCHEMA = `
## 数据库表结构

### students（学生表）
- student_id: 学生ID（主键）
- student_code: 学号
- name: 姓名
- gender: 性别
- phone: 联系电话
- email: 邮箱
- class_id: 班级ID（外键）
- status: 学籍状态（在读/休学/毕业）

### classes（班级表）
- class_id: 班级ID（主键）
- class_name: 班级名称
- major_id: 专业ID（外键）

### majors（专业表）
- major_id: 专业ID（主键）
- major_name: 专业名称
- college_id: 学院ID（外键）

### colleges（学院表）
- college_id: 学院ID（主键）
- college_name: 学院名称

### grades（成绩表）
- grade_id: 成绩ID（主键）
- student_id: 学生ID（外键）
- offering_id: 课程开课ID（外键）
- usual_score: 平时成绩
- midterm_score: 期中成绩
- final_score: 期末成绩
- total_score: 总评成绩

### courses（课程表）
- course_id: 课程ID（主键）
- course_name: 课程名称
- course_code: 课程代码
- credits: 学分
- course_type: 课程类型

### course_offerings（课程开课表）
- offering_id: 开课ID（主键）
- course_id: 课程ID（外键）
- teacher_id: 教师ID（外键）
- class_id: 班级ID（外键）
- semester: 学期
- schedule: 上课时间
- classroom: 教室

### teachers（教师表）
- teacher_id: 教师ID（主键）
- name: 姓名
- college_id: 学院ID（外键）
`;

/**
 * 将自然语言转换为SQL
 * @param {string} naturalLanguage - 用户的自然语言查询
 * @param {Array} context - 对话上下文
 * @returns {Promise<Object>}
 */
async function generateSQL(naturalLanguage, context = []) {
  try {
    // 构建提示词
    const systemPrompt = `你是一个专业的SQL查询生成助手。请根据用户的自然语言查询，生成对应的MySQL SQL语句。

${DATABASE_SCHEMA}

## 规则：
1. 只生成SELECT查询，不要生成INSERT/UPDATE/DELETE
2. 使用JOIN来关联多表查询
3. 添加适当的WHERE条件
4. 返回格式必须是JSON：{"sql": "你的SQL语句", "explanation": "查询说明", "expectedRows": "预计返回行数(少量/中等/大量)"}
5. 预计返回行数判断：
   - 少量：< 50条
   - 中等：50-500条
   - 大量：> 500条

## 示例：
用户输入："查询计算机专业的所有学生"
返回：
{
  "sql": "SELECT s.* FROM students s LEFT JOIN classes c ON s.class_id = c.class_id LEFT JOIN majors m ON c.major_id = m.major_id WHERE m.major_name = '计算机'",
  "explanation": "查询计算机专业的学生信息",
  "expectedRows": "大量"
}`;

    // 构建消息（包含上下文）
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.role === 'user' ? msg.content : msg.answer
      })),
      { role: 'user', content: naturalLanguage }
    ];

    // 调用智谱AI
    const response = await zhipuChat(naturalLanguage, messages, {
      temperature: 0.3, // 降低温度以获得更确定的输出
      max_tokens: 1000
    });

    if (!response.success) {
      throw new Error('AI服务调用失败');
    }

    // 解析AI返回的JSON
    const jsonMatch = response.answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI返回格式不正确');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      sql: result.sql,
      explanation: result.explanation,
      expectedRows: result.expectedRows,
      rawResponse: response.answer
    };

  } catch (error) {
    console.error('SQL生成失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateSQL,
  DATABASE_SCHEMA
};
```

### 2. SQL安全验证器（sqlValidator.js）

```javascript
/**
 * SQL安全验证器
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

/**
 * 危险SQL关键词黑名单
 */
const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
  'CREATE', 'TRUNCATE', 'EXECUTE', 'EXEC', 'SCRIPT',
  'JAVASCRIPT', 'DECLARE', 'CURSOR', 'PROCEDURE'
];

/**
 * 验证SQL是否安全
 * @param {string} sql - 待验证的SQL
 * @returns {Object} {safe: boolean, error: string}
 */
function validateSQL(sql) {
  if (!sql || typeof sql !== 'string') {
    return { safe: false, error: 'SQL不能为空' };
  }

  // 转换为大写进行检测
  const upperSQL = sql.toUpperCase();

  // 检查是否包含危险关键词
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperSQL.includes(keyword)) {
      return {
        safe: false,
        error: `SQL包含危险关键词: ${keyword}`
      };
    }
  }

  // 必须是SELECT语句
  if (!upperSQL.trim().startsWith('SELECT')) {
    return {
      safe: false,
      error: '只允许SELECT查询'
    };
  }

  // 检查是否有注释注入
  if (sql.includes('--') || sql.includes('/*')) {
    return {
      safe: false,
      error: 'SQL不允许包含注释'
    };
  }

  // 检查是否有多条语句
  if (sql.split(';').filter(s => s.trim()).length > 1) {
    return {
      safe: false,
      error: '只允许单条SQL语句'
    };
  }

  return { safe: true };
}

module.exports = {
  validateSQL
};
```

### 3. 上下文管理器（contextManager.js）

```javascript
/**
 * 上下文管理器
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

class ContextManager {
  constructor() {
    // 存储每个会话的上下文
    this.contexts = new Map();
  }

  /**
   * 添加消息到上下文
   * @param {string} sessionId - 会话ID
   * @param {string} role - 角色（user/assistant）
   * @param {string} content - 消息内容
   * @param {Object} metadata - 元数据（查询结果等）
   */
  addMessage(sessionId, role, content, metadata = {}) {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, []);
    }

    const context = this.contexts.get(sessionId);
    context.push({
      role,
      content,
      metadata,
      timestamp: new Date()
    });

    // 限制上下文长度（最近10条）
    if (context.length > 10) {
      context.shift();
    }
  }

  /**
   * 获取会话上下文
   * @param {string} sessionId - 会话ID
   * @returns {Array}
   */
  getContext(sessionId) {
    return this.contexts.get(sessionId) || [];
  }

  /**
   * 清除会话上下文
   * @param {string} sessionId - 会话ID
   */
  clearContext(sessionId) {
    this.contexts.delete(sessionId);
  }

  /**
   * 提取上下文中的关键信息
   * @param {string} sessionId - 会话ID
   * @returns {Object}
   */
  extractKeyInfo(sessionId) {
    const context = this.getContext(sessionId);
    const keyInfo = {
      lastQuery: null,
      lastResult: null,
      entities: {} // 提取的实体（如专业、学院等）
    };

    for (const msg of context) {
      if (msg.metadata) {
        if (msg.metadata.query) {
          keyInfo.lastQuery = msg.metadata.query;
        }
        if (msg.metadata.result) {
          keyInfo.lastResult = msg.metadata.result;
        }
        if (msg.metadata.entities) {
          Object.assign(keyInfo.entities, msg.metadata.entities);
        }
      }
    }

    return keyInfo;
  }
}

module.exports = new ContextManager();
```

### 4. 智能查询路由（intelligent.js）

```javascript
/**
 * 智能查询路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');
const { generateSQL } = require('../services/sqlGenerator');
const { validateSQL } = require('../middlewares/sqlValidator');
const contextManager = require('../services/contextManager');
const { exportQueryResult } = require('../services/exportExcel');

/**
 * 智能查询接口
 * POST /api/intelligent/query
 */
router.post('/query', authenticate, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const { id: userId, type: userType } = req.user;

    if (!message) {
      return error(res, '查询内容不能为空', 400);
    }

    console.log('🧠 智能查询请求:', { message, sessionId, userType });

    // 1. 生成SQL
    const context = contextManager.getContext(sessionId);
    const sqlResult = await generateSQL(message, context);

    if (!sqlResult.success) {
      return error(res, 'SQL生成失败: ' + sqlResult.error, 500);
    }

    const { sql, explanation, expectedRows } = sqlResult;

    console.log('📝 生成的SQL:', sql);
    console.log('💡 查询说明:', explanation);
    console.log('📊 预计行数:', expectedRows);

    // 2. 验证SQL安全性
    const validation = validateSQL(sql);
    if (!validation.safe) {
      return error(res, 'SQL安全验证失败: ' + validation.error, 403);
    }

    // 3. 执行查询
    let queryResult;
    try {
      queryResult = await query(sql);
      console.log('✅ 查询成功，返回', queryResult.length, '条记录');
    } catch (err) {
      console.error('❌ 查询执行失败:', err);
      return error(res, '查询执行失败: ' + err.message, 500);
    }

    // 4. 评估结果并决定返回方式
    const rowCount = queryResult.length;
    let responseType, downloadUrl, responseMessage;

    if (rowCount === 0) {
      responseType = 'empty';
      responseMessage = `未找到相关数据～${explanation ? '\n' + explanation : ''}`;
    } else if (rowCount <= 50) {
      // 少量数据：直接返回
      responseType = 'display';
      responseMessage = `✅ 查询成功！找到 ${rowCount} 条记录\n\n${explanation || ''}`;
    } else if (rowCount <= 500) {
      // 中等数据：分页 + 下载
      responseType = 'pagination';
      downloadUrl = `/api/intelligent/download/${sessionId}`;
      responseMessage = `✅ 查询成功！找到 ${rowCount} 条记录\n\n由于数据量较大，已为您生成Excel下载链接，同时显示前50条预览。\n\n${explanation || ''}`;
    } else {
      // 大量数据：只提供下载
      responseType = 'download';
      downloadUrl = `/api/intelligent/download/${sessionId}`;
      responseMessage = `✅ 查询成功！找到 ${rowCount} 条记录\n\n由于数据量很大，已为您生成Excel下载链接，请点击下方按钮下载完整数据。\n\n${explanation || ''}`;
    }

    // 5. 保存到上下文
    contextManager.addMessage(sessionId, 'user', message, { query: sql });
    contextManager.addMessage(sessionId, 'assistant', responseMessage, {
      result: queryResult,
      sql: sql,
      rowCount: rowCount
    });

    // 6. 返回结果
    return success(res, {
      answer: JSON.stringify({
        type: 'intelligent_query',
        responseType: responseType,
        message: responseMessage,
        explanation: explanation,
        rowCount: rowCount,
        data: responseType !== 'download' ? queryResult.slice(0, 50) : null, // 最多返回50条
        downloadUrl: downloadUrl,
        sql: sql // 调试用，实际可以不返回
      }),
      intent: 'intelligent_query'
    }, '查询成功');

  } catch (err) {
    console.error('❌ 智能查询错误:', err);
    error(res, '智能查询失败', 500);
  }
});

/**
 * 下载查询结果
 * GET /api/intelligent/download/:sessionId
 */
router.get('/download/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 从上下文中获取最后一次查询结果
    const context = contextManager.getContext(sessionId);
    const lastAssistantMessage = [...context].reverse().find(msg => msg.role === 'assistant' && msg.metadata?.result);

    if (!lastAssistantMessage) {
      return error(res, '未找到查询结果', 404);
    }

    const { result, sql } = lastAssistantMessage.metadata;

    if (!result || result.length === 0) {
      return error(res, '查询结果为空', 404);
    }

    // 生成Excel
    const buffer = await exportQueryResult(result, sql);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=query_result_${Date.now()}.xlsx`);
    res.send(buffer);

  } catch (err) {
    console.error('❌ 下载失败:', err);
    error(res, '下载失败: ' + err.message, 500);
  }
});

module.exports = router;
```

### 5. 前端聊天界面增强（Chat.jsx）

```javascript
// 在 handleSend 函数中添加智能查询处理

// ... 现有代码 ...

try {
  console.log('📡 发送请求到 /api/chat');

  // 优先尝试智能查询
  const intelligentResponse = await axios.post(
    '/api/intelligent/query',
    { message: input, sessionId },
    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
  );

  if (intelligentResponse.data.success) {
    const aiContent = intelligentResponse.data.data.answer;
    const parsed = JSON.parse(aiContent);

    if (parsed.type === 'intelligent_query') {
      // 处理智能查询结果
      return setMessages(prev => [...prev, {
        role: 'assistant',
        content: parsed.message,
        isIntelligentQuery: true,
        queryData: parsed.data,
        rowCount: parsed.rowCount,
        downloadUrl: parsed.downloadUrl,
        responseType: parsed.responseType
      }]);
    }
  }
} catch (err) {
  // 如果智能查询失败，回退到普通聊天
  console.log('智能查询失败，使用普通聊天');
}

// ... 继续原有的聊天逻辑 ...
```

---

## 🎨 UI组件设计

### 查询结果表格组件（QueryResultTable.jsx）

```javascript
/**
 * 查询结果表格组件
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

import React, { useState } from 'react';
import { Table, Button, Tag } from 'antd';

function QueryResultTable({ data, rowCount, downloadUrl }) {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: rowCount
  });

  if (!data || data.length === 0) {
    return <p>暂无数据</p>;
  }

  // 动态生成列
  const columns = Object.keys(data[0]).map(key => ({
    title: key,
    dataIndex: key,
    key: key,
    ellipsis: true,
    render: (text) => text || '-'
  }));

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tag color="blue">共 {rowCount} 条记录</Tag>
        {downloadUrl && (
          <Button type="primary" size="small">
            📥 下载完整数据
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={data}
        pagination={pagination}
        onChange={(newPagination) => setPagination(newPagination)}
        size="small"
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}

export default QueryResultTable;
```

---

## 🚀 使用示例

### 示例1：简单查询
```
用户: "查询所有计算机专业的学生"
AI: ✅ 查询成功！找到 156 条记录
     由于数据量较大，已为您生成Excel下载链接...
     [显示前50条数据预览]
     [下载按钮]
```

### 示例2：多轮对话
```
用户: "查询计算机专业的学生"
AI: [显示结果]

用户: "他们里面有多少女生？"
AI: ✅ 查询成功！找到 78 条记录（基于上一次查询结果筛选）
     [显示女生列表]
```

### 示例3：大数据量
```
用户: "查询全校所有学生信息"
AI: ✅ 查询成功！找到 5234 条记录
     由于数据量很大，已为您生成Excel下载链接...
     [下载按钮]
```

---

## 🛡️ 安全措施

1. **SQL注入防护**：
   - 只允许SELECT查询
   - 禁止危险关键词
   - 使用参数化查询

2. **查询限制**：
   - 单次查询最多返回10000条
   - 超时时间：30秒
   - 上下文限制：最近10条消息

3. **权限控制**：
   - 学生只能查询自己的数据
   - 教师可以查询所教班级/学院
   - 管理员可以查询所有数据

---

## 📈 性能优化

1. **缓存机制**：相同查询缓存结果
2. **分页查询**：大数据量自动分页
3. **索引优化**：确保常用查询字段有索引
4. **异步处理**：大数据量查询异步生成Excel

---

## 🎯 实现优先级

### Phase 1（核心功能）
- ✅ SQL生成引擎
- ✅ SQL安全验证
- ✅ 智能查询路由
- ✅ 基础UI组件

### Phase 2（增强功能）
- ⏳ 上下文管理
- ⏳ 智能结果评估
- ⏳ Excel导出

### Phase 3（高级功能）
- ⏳ 多轮对话优化
- ⏳ 查询历史记录
- ⏳ 性能监控

---

_设计完成时间：2026-03-20_
_设计师：内师智能体系统_
_版本：v1.0 智能SQL查询系统_
