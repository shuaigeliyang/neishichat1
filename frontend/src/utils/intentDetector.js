/**
 * 意图识别工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：判断用户问题应该使用哪种查询方式
 */

/**
 * 检测问题意图
 * @param {string} question - 用户问题
 * @returns {string} - 查询类型：'database' | 'document' | 'form_generate' | 'form_list' | 'chat'
 */
export const detectIntent = (question) => {
  // 🔝 最高优先级：基于文档回答（用户明确要求使用RAG/文档问答）
  // 只要用户提到"基于文档"相关表达，直接触发文档问答，忽略其他所有判断！
  const ragExplicitKeywords = [
    // ✨ 核心RAG触发词（最高优先级！）
    '基于文档', '基于文档库', '基于文档回答', '基于选择的文档',
    '使用rag', '使用RAG', 'rag服务', 'RAG服务',
    '文档问答', '文档库回答', '从文档库', '在文档中',
    '从文档中', '文档里找', '文档里查', '文档查找',
    '在文档里找', '文档库里', '文档库里找',
    // 实验相关
    '实验一', '实验二', '实验三', '实验四', '实验报告',
    '基于实验', '根据实验', '实验内容摘要', '实验目的',
    '实验内容', '实验步骤', '实验要求', '实验结果',
    '实验总结', '实验小结', '实验摘要'
  ];

  const hasRagExplicit = ragExplicitKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasRagExplicit) {
    console.log('🎯 意图识别：【最高优先级】文档问答（用户明确要求）');
    return 'document';
  }

  // 0. 表单列表查询关键词（第二优先级）
  const formListKeywords = [
    '有哪些表单', '有什么表单', '表单列表', '查看表单',
    '显示表单', '表单有哪些', '表单是什么', '所有表单',
    '申请表有哪些', '表格有哪些', '表单可以', '表单下载'
  ];

  // 检查是否是表单列表查询（最高优先级）
  const hasFormListKeyword = formListKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasFormListKeyword) {
    console.log('🎯 意图识别：表单列表查询');
    return 'form_list';
  }

  // ✨ 0.05 已索引文档关键词（自动识别文档相关问题）
  // 优先级最高！确保文档相关问题能触发文档问答
  const documentKeywords = [
    // 学生手册
    '学生手册', '根据学生手册', '手册上', '手册里', '手册中',
    // 宠物领养系统
    '宠物', '领养', '领养系统', '领养流程', '领养条件',
    '动物', '猫', '狗', '宠物信息', '宠物领养',
    // 技术文档相关
    '系统', '设计', '实现', '开发', '功能', '模块',
    '数据库', '架构', '技术', 'Spring', 'Vue', 'MySQL',
    // 论文相关
    '论文', '毕业', '课题', '研究',
    // ✨ 通用文档关键词（必须放最前面，优先级最高）
    '文档', '文档库', '基于文档', '基于选择的文档',
    '这篇文档', '这份文档', '该文档', '该文件',
    // ✨ 实验相关文档关键词
    '实验三', '实验一', '实验二', '实验四', '实验报告',
    '实验内容', '实验目的', '实验步骤', '实验要求',
    '实验结果', '实验总结', '实验摘要', '实验小结'
  ];

  const hasDocumentKeyword = documentKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasDocumentKeyword) {
    console.log('🎯 意图识别：文档问答（基于已索引文档）');
    return 'document';
  }

  // 0.1 学生手册关键词（用于纯政策查询，不包含表单相关内容）
  const handbookKeywords = [
    '学生手册', '根据学生手册', '手册上', '手册里', '手册中'
  ];

  // 检查是否包含学生手册关键词
  const hasHandbookKeyword = handbookKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasHandbookKeyword) {
    console.log('🎯 意图识别：文档问答（学生手册）');
    return 'document';
  }

  // 0.15 表单生成关键词（优先级最高，必须在数据库查询之前）
  // 格式：生成动词+表单名称
  const formGenerateKeywords = ['下载', '生成', '我要', '我需要', '帮我', '给我'];

  const formNames = [
    '竞赛申请表', '转专业申请表', '奖学金申请表', '休学申请表',
    '复学申请表', '请假申请表', '缓考申请表', '重修申请表',
    '辅修申请表', '交换生申请表', '宿舍申请表', '贫困生认定申请表',
    '助学金申请表', '助学贷款申请表', '优秀学生申请表', '优秀毕业生申请表',
    '成绩证明', '在读证明', '毕业证明', '学位证明', '预毕业证明',
    '离校手续单', '申请表', '证明表', '证明申请表',
    // 🎯 新增：支持更多表单类型
    '考核表', '汇总表', '体系表', '认定表', '审批表',
    '登记表', '报名表', '推荐表', '呈批表', '评价标准',
    '实施办法', '实施细则', '管理细则', '工作细则',
    // 🎯 支持完整的内江师范学院表单名称
    '素质活动', '德育实践', '补修', '第二课堂成绩单',
    '本科毕业论文', '学生违纪处分', '成绩单'
  ];

  const hasGenerateKeyword = formGenerateKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  const hasFormName = formNames.some(formName =>
    question.toLowerCase().includes(formName.toLowerCase())
  );

  if (hasGenerateKeyword && hasFormName) {
    console.log('🎯 意图识别：表单生成');
    return 'form_generate';
  }

  // 0.16 明确的数据库查询模式（优先级低于表单生成）
  // 格式："我的+具体数据项" 或 "动词+数据项"
  const explicitDatabaseQuery = [
    // "我的+X" 模式
    '我的成绩', '我的学号', '我的姓名', '我的学院', '我的专业',
    '我的班级', '我的课表', '我的课程', '我的GPA', '我的绩点',
    '我的排名', '我的分数', '我的学分', '我的奖学金', '我的奖励',
    '我的处分', '我的考勤', '我的导师', '我的辅导员', '我的班主任',
    '我的身份', '我的账号', '我的权限',
    '我的挂科', '我的挂科记录', '挂科记录',
    // "动词+数据项" 模式（查/查询/查看/看看/帮我看）
    '查询成绩', '查成绩', '查看成绩', '看看成绩',
    '查询课表', '查课表', '查看课表', '看看课表',
    '查询课程', '查课程', '查看课程', '看看课程',
    '查询学分', '查学分', '查看学分',
    '查询排名', '查排名', '查看排名',
    '查询GPA', '查GPA', '查看GPA',
    '查询绩点', '查绩点', '查看绩点',
    '查询个人信息', '查个人信息', '查看个人信息',
    '查询班级', '查班级', '查看班级',
    '查询分数', '查分数', '查看分数',
    '查询挂科', '查挂科', '查看挂科',
    '帮我查成绩', '帮我看成绩', '给我看成绩',
    '帮我查课表', '帮我看课表', '给我看课表',
    '帮我查课程', '帮我看课程',
    '课表', '分数多少', '考了多少',
    '成绩怎么样', '成绩如何', '成绩情况',
    '课程情况', '学分情况', '还有多少学分'
    // 注意：'成绩单' 已移至表单名称列表，因为"下载成绩单"更常见
  ];

  const hasExplicitDatabaseKeyword = explicitDatabaseQuery.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasExplicitDatabaseKeyword) {
    console.log('🎯 意图识别：数据库查询（个人数据）');
    return 'database';
  }

  // 0.17 政策咨询关键词（优先级高于一般数据库查询）
  // 用于识别询问政策、规定、流程的问题

  // 🔒 重要：区分陈述句和咨询问题！
  // 陈述句示例："我挂科了"、"我不及格"、"我违纪了" → 应该是普通聊天
  // 咨询问题示例："挂科怎么办"、"挂科会怎么样" → 应该是文档问答

  // 咨询性问题关键词（必须同时满足这些才识别为文档问答）
  const inquiryKeywords = [
    // 基础咨询词
    '怎么办', '怎么处理', '如何处理', '怎么申请', '如何申请',
    '会怎么样', '有什么影响', '后果', '结果', '是什么', '有哪些',
    '怎么拿', '如何获得', '怎么获得', '怎么评', '如何评选',
    '怎么', '如何', '能不能', '可不可以', '是否', '可',

    // ✨ 新增：更多咨询性表达方式
    '能吗', '能否', '可以吗',
    '难吗', '难不难',
    '要吗', '要',
    '会吗',
    '被', '会被',
    '还', '还能',
    '有没有',
    '吗'  // 疑问词，必须配合policyTopics才识别为文档问答
  ];

  // 政策相关词汇（单独出现时不识别为文档问答）
  const policyTopics = [
    // 学业问题
    '挂科', '不及格', '补考', '重修', '退学', '休学', '复学',
    '转专业', '选课', '退课', '旷课', '迟到', '早退', '请假',

    // 奖惩问题
    '奖励', '处分', '违纪', '作弊', '记过', '警告',

    // 奖学金相关
    '奖学金', '助学金', '助学贷款', '贫困生', '资助',

    // 其他常见政策咨询
    '规定', '制度', '政策', '流程', '条件', '要求', '标准',
    '办理', '手续', '材料'
  ];

  // 检查是否同时包含咨询性关键词和政策相关词汇
  const hasInquiryKeyword = inquiryKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  const hasPolicyTopic = policyTopics.some(topic =>
    question.toLowerCase().includes(topic.toLowerCase())
  );

  // 🔒 特殊处理：检测疑问句模式
  // 如果问题以"吗"结尾，且包含政策词汇，识别为文档问答
  const questionPattern = /吗[？?！!]*$/;
  const isQuestion = questionPattern.test(question.trim());

  // 🔒 特殊处理：排除陈述句模式
  // 如果只是"我+事件+了"的模式（如"我挂科了"、"我不及格了"），不是咨询问题
  const statementPattern = /^我.+了$/;
  const isStatement = statementPattern.test(question.trim());

  // 如果同时满足以下条件之一，识别为文档问答：
  // 1. 包含咨询性关键词和政策词汇，且不是陈述句
  // 2. 以"吗"结尾的疑问句，且包含政策词汇
  if ((hasInquiryKeyword && hasPolicyTopic && !isStatement) || (isQuestion && hasPolicyTopic)) {
    console.log('🎯 意图识别：文档问答（政策规定）');
    return 'document';
  }

  // 0.2 一般数据库查询关键词（用于教师查询班级学生等）
  const databaseKeywords = [
    // 个人信息（不包含"我的+具体名词"的明确查询）
    '本人', '自己', '个人信息', '基本资料', '我的资料',
    '我的身份', '我是谁', '用户类型',

    // 授课相关（教师专用）
    '授课', '我授课', '我的授课', '授课班级', '我教的',
    '教的班级', '任课', '任课班级', '所教班级',

    // 班级相关（教师专用）
    '班级', '班级信息', '班级列表'
  ];

  // 检查是否包含数据库查询关键词
  const hasDatabaseKeyword = databaseKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasDatabaseKeyword) {
    console.log('🎯 意图识别：数据库查询（个人数据）');
    return 'database';
  }

  // 0.3 默认为普通聊天
  console.log('🎯 意图识别：普通聊天');
  return 'chat';
};

/**
 * 获取查询类型说明
 */
export const getIntentDescription = (intent) => {
  const descriptions = {
    database: '数据库查询（个人数据）',
    document: '文档问答（基于政策文档）',
    form_list: '表单列表查询',
    form_generate: '表单生成',
    chat: '智能对话（智谱AI）'
  };
  return descriptions[intent] || descriptions.chat;
};
