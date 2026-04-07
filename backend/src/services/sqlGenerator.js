/**
 * SQL生成引擎
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：将自然语言转换为SQL查询
 */

const axios = require('axios');
const logger = require('../utils/logger');

// 智谱AI配置
const API_KEY = process.env.ZHIPU_API_KEY;
const API_BASE = process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';

/**
 * 数据库表结构定义（用于AI理解）
 */
const DATABASE_SCHEMA = `
## 数据库表结构说明

### students（学生表）
- student_id INT: 学生ID（主键）
- student_code VARCHAR(20): 学号
- name VARCHAR(50): 姓名
- gender VARCHAR(10): 性别（男/女）
- class_id INT: 班级ID（外键，关联classes表）
- ⚠️ **重要：students表没有major_id字段！专业信息需要通过classes表关联！**
- phone VARCHAR(20): 联系电话
- email VARCHAR(100): 邮箱
- enrollment_date DATE: 入学日期
- status VARCHAR(20): 学籍状态（在读/休学/毕业）
- password VARCHAR(255): 密码
- created_at TIMESTAMP: 创建时间

### classes（班级表）
- class_id INT: 班级ID（主键）
- class_name VARCHAR(50): 班级名称
- class_code VARCHAR(20): 班级代码
- major_id INT: 专业ID（外键，关联majors表）
- grade YEAR: 年级
- teacher_id INT: 班主任ID（外键，关联teachers表）
- status TINYINT: 状态
- created_at TIMESTAMP: 创建时间

### majors（专业表）
- major_id INT: 专业ID（主键）
- major_name VARCHAR(100): 专业名称
- major_code VARCHAR(20): 专业代码
- college_id INT: 学院ID（外键，关联colleges表）
- degree_type VARCHAR(20): 学位类型
- duration TINYINT: 学制
- status TINYINT: 状态
- created_at TIMESTAMP: 创建时间

### colleges（学院表）
- college_id INT: 学院ID（主键）
- college_name VARCHAR(100): 学院名称
- college_code VARCHAR(20): 学院代码
- dean_name VARCHAR(50): 院长姓名
- status TINYINT: 状态
- created_at TIMESTAMP: 创建时间

### grades（成绩表）
- grade_id INT: 成绩ID（主键）
- student_id INT: 学生ID（外键，关联students表）
- offering_id INT: 课程开课ID（外键，关联course_offerings表）
- usual_score DECIMAL(5,2): 平时成绩
- midterm_score DECIMAL(5,2): 期中成绩
- final_score DECIMAL(5,2): 期末成绩
- total_score DECIMAL(5,2): 总评成绩
- created_at TIMESTAMP: 创建时间

### courses（课程表）
- course_id INT: 课程ID（主键）
- course_code VARCHAR(20): 课程代码
- course_name VARCHAR(100): 课程名称
- course_type VARCHAR(50): 课程类型（必修/选修）
- credits DECIMAL(3,1): 学分
- total_hours INT: 总学时
- status TINYINT: 状态
- created_at TIMESTAMP: 创建时间

### course_offerings（课程开课表）
- offering_id INT: 开课ID（主键）
- course_id INT: 课程ID（外键，关联courses表）
- teacher_id INT: 教师ID（外键，关联teachers表）
- semester VARCHAR(20): 学期（如：2024-1、2024-2025-1）
- class_id INT: 班级ID（外键，关联classes表）
- schedule VARCHAR(200): 上课时间
- classroom VARCHAR(50): 教室
- status TINYINT: 状态（1=开设，0=未开设）
- created_at TIMESTAMP: 创建时间

### teachers（教师表）
- teacher_id INT: 教师ID（主键）
- teacher_code VARCHAR(20): 教师工号
- name VARCHAR(50): 姓名
- gender VARCHAR(10): 性别
- college_id INT: 学院ID（外键，关联colleges表）
- title VARCHAR(20): 职称
- phone VARCHAR(20): 联系电话
- email VARCHAR(100): 邮箱
- status TINYINT: 状态
- password VARCHAR(255): 密码
- created_at TIMESTAMP: 创建时间

### form_templates（表格模板表）
- template_id INT: 模板ID（主键）
- template_name VARCHAR(200): 模板名称
- category VARCHAR(50): 分类（申请表/证明表/统计表等）
- description TEXT: 表格说明
- file_path VARCHAR(255): 文件路径
- file_type VARCHAR(20): 文件类型（pdf/doc/xls等）
- target_audience VARCHAR(50): 适用对象（全体学生/全体教师/全体用户）
- download_count INT: 下载次数
- status TINYINT: 状态（1=可用，0=不可用）
- created_at TIMESTAMP: 创建时间

### downloadable_forms（可下载表格表）
- form_id INT: 表格ID（主键）
- form_name VARCHAR(200): 表格名称
- category VARCHAR(50): 分类
- description TEXT: 表格说明
- file_url VARCHAR(255): 文件URL
- target_user VARCHAR(50): 适用对象（全体学生/全体教师/管理员/全体用户）
- download_count INT: 下载次数
- status TINYINT: 状态（1=可用，0=不可用）
- created_at TIMESTAMP: 创建时间
`;

/**
 * 常见查询示例
 */
const QUERY_EXAMPLES = `
## 查询示例

### 示例0：查询当前用户身份信息（最重要！）
用户："我的身份是什么" 或 "我是谁" 或 "查询我的账号信息"
SQL（学生）：
SELECT 
  '学生' AS '用户类型',
  student_code AS '学号',
  name AS '姓名',
  gender AS '性别',
  enrollment_date AS '入学日期',
  status AS '学籍状态'
FROM students
WHERE student_id = 1

SQL（教师）：
SELECT 
  '教师' AS '用户类型',
  teacher_code AS '工号',
  name AS '姓名',
  gender AS '性别',
  title AS '职称'
FROM teachers
WHERE teacher_id = 1

重要提示：
- 用户问"我的身份"、"我是谁"等问题时，必须根据用户类型返回对应表的个人信息
- 学生用户 → 查询 students 表，使用 student_id = ?
- 教师用户 → 查询 teachers 表，使用 teacher_id = ?
- 管理员用户 → 查询 admins 表，使用 admin_id = ?

### 示例1：查询学生信息
用户："查询计算机专业的所有学生"
SQL：
SELECT s.student_id, s.student_code, s.name, s.gender, s.phone, s.email
FROM students s
LEFT JOIN classes cl ON s.class_id = cl.class_id
LEFT JOIN majors m ON cl.major_id = m.major_id
WHERE m.major_name = '计算机'
AND s.status = '在读'
ORDER BY s.student_code

### 示例2：查询成绩
用户："查询张三的所有成绩"
SQL：
SELECT s.name AS '姓名', c.course_name AS '课程名称', c.course_code AS '课程代码',
g.total_score AS '总评成绩', co.semester AS '学期'
FROM grades g
LEFT JOIN students s ON g.student_id = s.student_id
LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
LEFT JOIN courses c ON co.course_id = c.course_id
WHERE s.name = '张三'
ORDER BY co.semester DESC

### 示例3：统计查询
用户："统计每个学院的学生人数"
SQL：
SELECT col.college_name AS '学院', COUNT(s.student_id) AS '学生人数'
FROM colleges col
LEFT JOIN majors m ON col.college_id = m.college_id
LEFT JOIN classes c ON m.major_id = c.major_id
LEFT JOIN students s ON c.class_id = s.class_id
WHERE s.status = '在读'
GROUP BY col.college_id, col.college_name
ORDER BY COUNT(s.student_id) DESC

### 示例4：查询专业及其学院
用户："查询所有专业及其学院"
SQL：
SELECT m.major_id, m.major_name, m.major_code, c.college_name
FROM majors m
LEFT JOIN colleges c ON m.college_id = c.college_id
ORDER BY c.college_name, m.major_name

### 示例5：多表关联
用户："查询2024-1学期开课情况"
SQL：
SELECT c.course_name, t.name AS '教师', cl.class_name, co.schedule, co.classroom
FROM course_offerings co
LEFT JOIN courses c ON co.course_id = c.course_id
LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
LEFT JOIN classes cl ON co.class_id = cl.class_id
WHERE co.semester = '2024-1' AND co.status = 1
ORDER BY c.course_name

### 示例5：教师查询授课班级
用户："查询我授课的班级信息" 或 "下载我授课班级的信息"
SQL：
SELECT
  cl.class_id AS '班级ID',
  cl.class_name AS '班级名称',
  m.major_name AS '专业名称',
  col.college_name AS '学院名称',
  COUNT(DISTINCT co.course_id) AS '授课门数',
  GROUP_CONCAT(DISTINCT c.course_name SEPARATOR '、') AS '授课课程'
FROM course_offerings co
LEFT JOIN classes cl ON co.class_id = cl.class_id
LEFT JOIN majors m ON cl.major_id = m.major_id
LEFT JOIN colleges col ON m.college_id = col.college_id
LEFT JOIN courses c ON co.course_id = c.course_id
WHERE co.teacher_id = 1 AND co.status = 1
GROUP BY cl.class_id, cl.class_name, m.major_name, col.college_name
ORDER BY cl.class_name

### 示例6：教师查询授课课程
用户："查询我授课的课程" 或 "我的授课课程"
SQL：
SELECT
  c.course_name AS '课程名称',
  c.course_code AS '课程代码',
  cl.class_name AS '授课班级',
  co.semester AS '学期',
  co.schedule AS '上课时间',
  co.classroom AS '教室'
FROM course_offerings co
LEFT JOIN courses c ON co.course_id = c.course_id
LEFT JOIN classes cl ON co.class_id = cl.class_id
WHERE co.teacher_id = 1 AND co.status = 1
ORDER BY co.semester DESC, c.course_name

### 示例7：学生查询课程表（重要！）
用户："我的课程表" 或 "查询我的课程" 或 "我的课表"
SQL：
SELECT
  c.course_name AS '课程名称',
  c.course_code AS '课程代码',
  co.semester AS '学期',
  co.schedule AS '上课时间',
  co.classroom AS '教室',
  t.name AS '授课教师',
  cl.class_name AS '班级'
FROM grades g
LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
LEFT JOIN courses c ON co.course_id = c.course_id
LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
LEFT JOIN classes cl ON co.class_id = cl.class_id
WHERE g.student_id = 1
ORDER BY co.semester DESC, c.course_name

注意：学生查询课程表必须从 grades 表开始，通过 offering_id 关联课程信息！

### 示例8：学生查询自己所在班级信息（重要权限示例）
用户："我的班级信息" 或 "我的班级" 或 "班级信息"
SQL：
SELECT
  cl.class_name AS '班级名称',
  m.major_name AS '专业名称',
  col.college_name AS '学院名称',
  COUNT(DISTINCT s.student_id) AS '班级人数',
  t.name AS '班主任'
FROM students s
LEFT JOIN classes cl ON s.class_id = cl.class_id
LEFT JOIN majors m ON cl.major_id = m.major_id
LEFT JOIN colleges col ON m.college_id = col.college_id
LEFT JOIN teachers t ON cl.teacher_id = t.teacher_id
WHERE s.student_id = 1
GROUP BY cl.class_id, cl.class_name, m.major_name, col.college_name, t.name

重要提示：学生查询班级信息时，必须从 students 表开始，通过 WHERE student_id = ? 限制只能查询自己所在的班级！不能查询 course_offerings 表获取教师授课信息！

### 示例9：教师查询授课班级的学生信息（重要！）
用户："下载我授课班级的全部学生信息" 或 "查询我授课班级的学生"
SQL：
SELECT 
  s.student_id AS '学生ID',
  s.student_code AS '学号',
  s.name AS '姓名',
  s.gender AS '性别',
  s.phone AS '联系电话',
  s.email AS '邮箱',
  cl.class_name AS '班级',
  m.major_name AS '专业',
  col.college_name AS '学院'
FROM course_offerings co
LEFT JOIN classes cl ON co.class_id = cl.class_id
LEFT JOIN students s ON cl.class_id = s.class_id
LEFT JOIN majors m ON cl.major_id = m.major_id
LEFT JOIN colleges col ON m.college_id = col.college_id
WHERE co.teacher_id = 1 AND co.status = 1 AND s.status = '在读'
ORDER BY cl.class_name, s.student_code

### 示例10：教师查询授课班级学生的成绩（重要！）
用户："查询我授课班级的所有学生的成绩" 或 "查询我授课课程的学生成绩"
SQL：
SELECT 
  s.student_id AS '学生ID',
  s.student_code AS '学号',
  s.name AS '姓名',
  cl.class_name AS '班级',
  c.course_name AS '课程名称',
  g.usual_score AS '平时成绩',
  g.midterm_score AS '期中成绩',
  g.final_score AS '期末成绩',
  g.total_score AS '总评成绩',
  co.semester AS '学期'
FROM grades g
LEFT JOIN students s ON g.student_id = s.student_id
LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
LEFT JOIN courses c ON co.course_id = c.course_id
LEFT JOIN classes cl ON s.class_id = cl.class_id
WHERE co.teacher_id = 1 AND co.status = 1 AND s.status = '在读'
ORDER BY cl.class_name, c.course_name, co.semester DESC

重要提示：
- 查询成绩必须从 **grades** 表开始！
- 通过 **g.offering_id = co.offering_id** 关联 course_offerings 获取教师信息
- 使用 **co.teacher_id = ?** 限制是当前教师授课的课程
- 班级表的别名是 **cl**，不是 c！使用 **cl.class_name**

### 示例11：学生查询奖学金相关信息（重要！）
用户："我的奖学金" 或 "奖学金申请表" 或 "如何申请奖学金"
SQL（学生）：
SELECT
  ft.template_name AS '表格名称',
  ft.category AS '分类',
  ft.description AS '说明',
  ft.file_path AS '文件路径',
  ft.download_count AS '下载次数'
FROM form_templates ft
WHERE ft.template_name LIKE '%奖学金%'
  AND ft.target_audience IN ('全体学生', '全体用户')
  AND ft.status = 1
ORDER BY ft.template_name

重要提示：
- ⚠️ 数据库中**没有scholarships表**！
- 奖学金信息存储在 **form_templates** 和 **downloadable_forms** 表中
- 学生查询奖学金时，应该查询这些表格模板表
- 不要尝试查询students.scholarship_id或类似的字段（不存在！）

### 示例12：正确的学生专业信息查询（重要！）
用户："我的专业" 或 "我的专业信息"
SQL（学生）：
SELECT
  s.name AS '姓名',
  s.student_code AS '学号',
  cl.class_name AS '班级',
  m.major_name AS '专业名称',
  m.major_code AS '专业代码',
  c.college_name AS '学院名称',
  m.degree_type AS '学位类型'
FROM students s
LEFT JOIN classes cl ON s.class_id = cl.class_id
LEFT JOIN majors m ON cl.major_id = m.major_id
LEFT JOIN colleges c ON m.college_id = c.college_id
WHERE s.student_id = 1

重要提示：
- ⚠️ students表**没有major_id字段**！
- 必须通过 **students.class_id → classes → classes.major_id → majors** 的链路来获取专业信息
- 不要直接使用 s.major_id（字段不存在！）
`;

/**
 * 生成SQL的主函数
 * @param {string} naturalLanguage - 用户的自然语言查询
 * @param {Array} context - 对话上下文（可选）
 * @param {Object} userContext - 用户上下文信息（学生/教师/管理员）
 * @returns {Promise<Object>}
 */
async function generateSQL(naturalLanguage, context = [], userContext = {}) {
  try {
    if (!API_KEY) {
      throw new Error('未配置ZHIPU_API_KEY环境变量');
    }

    logger.info('开始SQL生成', { naturalLanguage: naturalLanguage.substring(0, 50) });

    // 构建系统提示词
    const systemPrompt = `你是一个专业的MySQL SQL查询生成助手。请根据用户的自然语言查询，生成对应的SQL语句。

${DATABASE_SCHEMA}

${QUERY_EXAMPLES}

## 重要规则：
1. **只生成SELECT查询**，绝对不要生成INSERT/UPDATE/DELETE/DROP等修改数据的语句
2. **使用JOIN来关联多表查询**，不要使用子查询（性能更好）
3. **添加适当的WHERE条件**，如status = '在读'等
4. **使用AS给列起别名**，让结果更易读
5. **添加ORDER BY**进行排序
6. **返回格式必须是JSON**

## ⚠️ 字段存在性警告（非常重要！）：
- ❌ students表**没有major_id字段**！专业信息通过 classes.major_id 获取
- ❌ students表**没有scholarship相关字段**！奖学金信息在form_templates表
- ❌ 不存在scholarships表！奖学金相关查询使用form_templates或downloadable_forms表
- ✅ 正确的专业信息链路：students.class_id → classes.class_id → classes.major_id → majors.major_id
- ✅ 正确的奖学金查询：SELECT * FROM form_templates WHERE template_name LIKE '%奖学金%'

## 重要权限规则（必须遵守）：
${userContext.type === 'student' ? `
**学生用户权限限制：**
- ✅ 可以查询：自己的个人信息、自己的成绩、自己的课程表、自己所在的班级信息
- ❌ 不能查询：教师授课信息、其他学生信息、全校班级列表、教师列表、学院统计等管理数据
- ⚠️ 如果学生查询"班级信息"、"授课班级"、"教师信息"等：
  - 只能查询自己所在的班级（通过 students.class_id 关联）
  - 不能查询 course_offerings 表获取教师授课信息
  - 不能查询所有班级列表
- 示例：学生查询"我的班级信息" → FROM students s LEFT JOIN classes c ON s.class_id = c.class_id WHERE s.student_id = ${userContext.id}
` : ''}

${userContext.type === 'teacher' ? `
**教师用户权限范围：**
- ✅ 可以查询：自己的个人信息、自己授课的班级、自己授课的课程、所教班级的学生信息
- ✅ 可以查询：所在学院的教师信息、所在学院的班级信息
- ❌ 不能查询：其他教师的授课信息、其他学院的详细数据
- 示例：教师查询"授课班级" → FROM course_offerings WHERE teacher_id = ${userContext.id}
` : ''}

## 返回JSON格式：
\`\`\`json
{
  "sql": "你的SQL语句",
  "explanation": "查询说明（用友好的语言解释这个查询做什么）",
  "expectedRows": "预计返回行数(少量<50/中等50-500/大量>500)",
  "suggestions": ["建议1", "建议2"] // 可选，给用户的后续查询建议
}
\`\`\`

## 预计返回行数判断：
- 少量：< 50条（如：查询某个学生的成绩、某个专业的某门课程）
- 中等：50-500条（如：查询某个专业的学生、某个学院的课程）
- 大量：> 500条（如：查询全校学生、所有课程）

## 用户权限信息：
${userContext.type === 'student' ? `- 这是学生用户，只能查询自己的数据
- 当前用户ID（student_id）：${userContext.id}
- 当查询"我"或"我的"个人信息时（包括"我的身份是什么"、"我是谁"、"我的账号"等）：
  - 必须使用 FROM students WHERE student_id = ${userContext.id}
  - 不要查询teachers或admins表
- 当查询"我的成绩"时：
  - 必须使用 FROM grades WHERE student_id = ${userContext.id}
- 当查询"我的课程表"或"我的课表"时（非常重要！）：
  - 必须从 grades 表开始查询：FROM grades g
  - 通过 offering_id 关联：LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
  - WHERE 条件：WHERE g.student_id = ${userContext.id}
  - 不要直接查询 course_offerings 表！` : ''}
${userContext.type === 'teacher' ? `- 这是教师用户，可以查询所教班级和学院的数据
- 当前用户ID（teacher_id）：${userContext.id}
- 当查询"我"或"我的"个人信息时（包括"我的身份是什么"、"我是谁"、"我的账号"等）：
  - 必须使用 FROM teachers WHERE teacher_id = ${userContext.id}
  - 不要查询students或admins表
- 当查询"我的课程"或"我的授课"或"授课班级"时：
  - 必须使用 FROM course_offerings WHERE teacher_id = ${userContext.id}
- 当查询"我授课班级的学生"或"下载授课班级学生信息"时（非常重要！）：
  - 班级表的别名是 **cl**，使用 **cl.class_name**
  - 然后通过 classes 表(别名cl)关联 students 表获取学生信息
  - 必须过滤 s.status = '在读'
  - 示例：FROM course_offerings co LEFT JOIN classes cl ON co.class_id = cl.class_id LEFT JOIN students s ON cl.class_id = s.class_id WHERE co.teacher_id = ${userContext.id} AND s.status = '在读'
- 当查询"我授课班级的学生成绩"或"查询授课课程的学生成绩"时（非常重要！）：
  - 必须从 **grades** 表开始查询
  - 通过 **g.offering_id = co.offering_id** 关联 course_offerings 表
  - 使用 **co.teacher_id = ${userContext.id}** 限制是当前教师授课的课程
  - 班级表的别名是 **cl**，使用 **cl.class_name**
  - 示例：FROM grades g LEFT JOIN students s ON g.student_id = s.student_id LEFT JOIN course_offerings co ON g.offering_id = co.offering_id LEFT JOIN classes cl ON s.class_id = cl.class_id WHERE co.teacher_id = ${userContext.id}` : ''}
${userContext.type === 'admin' ? `- 这是管理员用户，可以查询所有数据
- 当前用户ID（admin_id）：${userContext.id}
- 当查询"我的"或"我的"个人信息时：
  - 必须使用 FROM admins WHERE admin_id = ${userContext.id}` : ''}

## 重要表名映射：
- 学生个人信息 → students表（使用student_id）
- 教师个人信息 → teachers表（使用teacher_id）
- 管理员个人信息 → admins表（使用admin_id）
- 学生成绩 → grades表（使用student_id）
- 授课课程 → course_offerings表（使用teacher_id）

## 注意事项：
- 如果用户提到"我"、"我的"、"本人"、"个人信息"，必须根据用户类型选择正确的表：
  - 学生查询个人信息：FROM students WHERE student_id = ${userContext.id}
  - 教师查询个人信息：FROM teachers WHERE teacher_id = ${userContext.id}
  - 管理员查询个人信息：FROM admins WHERE admin_id = ${userContext.id}
- 日期格式使用 'YYYY-MM-DD'
- 字符串使用单引号
- 不要使用分号结尾
- 确保SQL语法正确，可以在MySQL中直接执行`;

    // 构建消息数组（包含上下文）
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // 添加对话历史作为上下文
      ...context.slice(-5).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.role === 'user' ? msg.content : (msg.answer || msg.content || '')
      })),
      {
        role: 'user',
        content: naturalLanguage
      }
    ];

    // 调用智谱AI
    const response = await axios.post(
      `${API_BASE}/chat/completions`,
      {
        model: MODEL,
        messages: messages,
        temperature: 0.3, // 降低温度以获得更确定的输出
        top_p: 0.9,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 60000 // 增加到60秒，避免超时
      }
    );

    // 解析响应
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const answer = response.data.choices[0].message.content.trim();

      logger.info('AI SQL生成响应', {
        answerLength: answer.length,
        answerPreview: answer.substring(0, 500)
      });

      let result;

      // 尝试多种方式提取JSON
      try {
        // 方式1：尝试直接解析（如果AI直接返回JSON）
        if (answer.startsWith('{')) {
          result = JSON.parse(answer);
          logger.info('使用方式1解析成功（直接解析）');
        }
        // 方式2：提取Markdown代码块中的JSON
        else if (answer.includes('```json')) {
          const codeBlockMatch = answer.match(/```json\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            result = JSON.parse(codeBlockMatch[1].trim());
            logger.info('使用方式2解析成功（Markdown json代码块）');
          } else {
            throw new Error('无法从Markdown代码块中提取JSON');
          }
        }
        // 方式3：提取普通代码块中的JSON
        else if (answer.includes('```')) {
          const codeBlockMatch = answer.match(/```\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            result = JSON.parse(codeBlockMatch[1].trim());
            logger.info('使用方式3解析成功（普通代码块）');
          } else {
            throw new Error('无法从普通代码块中提取JSON');
          }
        }
        // 方式4：使用贪婪模式匹配最后一个完整的JSON对象
        else {
          const jsonMatches = answer.match(/\{[\s\S]*?\}/g);
          if (jsonMatches && jsonMatches.length > 0) {
            // 尝试从后往前找（因为AI可能在JSON后面添加说明）
            for (let i = jsonMatches.length - 1; i >= 0; i--) {
              try {
                result = JSON.parse(jsonMatches[i]);
                logger.info(`使用方式4解析成功（贪婪模式，第${i + 1}个匹配）`);
                break;
              } catch (e) {
                // 继续尝试下一个
                if (i === 0) {
                  throw e;
                }
              }
            }
          } else {
            throw new Error('未找到任何JSON格式的响应');
          }
        }
      } catch (parseError) {
        logger.error('JSON解析失败', {
          error: parseError.message,
          answer: answer.substring(0, 1000)
        });
        throw new Error('AI返回格式不正确，未找到有效的JSON: ' + parseError.message);
      }

      // 验证返回的SQL
      if (!result.sql || typeof result.sql !== 'string') {
        throw new Error('AI返回的SQL格式不正确');
      }

      logger.info('SQL生成成功', {
        sql: result.sql.substring(0, 100),
        expectedRows: result.expectedRows
      });

      return {
        success: true,
        sql: result.sql,
        explanation: result.explanation,
        expectedRows: result.expectedRows || '中等',
        suggestions: result.suggestions || [],
        rawResponse: answer
      };

    } else {
      throw new Error('智谱AI响应格式不正确');
    }

  } catch (error) {
    logger.error('SQL生成失败', {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message,
      sql: null
    };
  }
}

module.exports = {
  generateSQL,
  DATABASE_SCHEMA
};
