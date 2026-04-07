/**
 * 意图识别测试
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：测试意图识别器是否正确识别各种问题
 */

// 模拟意图识别函数（优化后的版本）
export const detectIntent = (question) => {
  // 1. 表单列表查询关键词（优先级最高）
  const formListKeywords = [
    '有哪些表单', '有什么表单', '表单列表', '查看表单',
    '显示表单', '表单有哪些', '表单是什么', '所有表单',
    '申请表有哪些', '表格有哪些', '表单可以', '表单下载'
  ];

  const hasFormListKeyword = formListKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasFormListKeyword) {
    return 'form_list';
  }

  // 2. 学生手册关键词
  const handbookKeywords = [
    '学生手册', '根据学生手册', '手册上', '手册里', '手册中'
  ];

  const hasHandbookKeyword = handbookKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasHandbookKeyword) {
    return 'document';
  }

  // 3. 明确的数据库查询模式（优先级最高）
  // 格式："我的+具体数据项"
  const explicitDatabaseQuery = [
    '我的成绩', '我的学号', '我的姓名', '我的学院', '我的专业',
    '我的班级', '我的课表', '我的课程', '我的GPA', '我的绩点',
    '我的排名', '我的分数', '我的学分', '我的奖学金', '我的奖励',
    '我的处分', '我的考勤', '我的导师', '我的辅导员', '我的班主任',
    '我的身份', '我的账号', '我的权限'
  ];

  const hasExplicitDatabaseKeyword = explicitDatabaseQuery.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasExplicitDatabaseKeyword) {
    return 'database';
  }

  // 4. 表单生成关键词
  const formGenerateKeywords = ['下载', '生成', '我要', '我需要', '帮我', '给我'];

  const formNames = [
    '竞赛申请表', '转专业申请表', '奖学金申请表', '休学申请表',
    '复学申请表', '请假申请表', '缓考申请表', '重修申请表',
    '辅修申请表', '交换生申请表', '宿舍申请表', '贫困生认定申请表',
    '助学金申请表', '助学贷款申请表', '优秀学生申请表', '优秀毕业生申请表',
    '成绩证明', '在读证明', '毕业证明', '学位证明', '预毕业证明',
    '离校手续单', '申请表', '证明表', '证明申请表'
  ];

  const hasGenerateKeyword = formGenerateKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  const hasFormName = formNames.some(formName =>
    question.toLowerCase().includes(formName.toLowerCase())
  );

  if (hasGenerateKeyword && hasFormName) {
    return 'form_generate';
  }

  // 5. 政策咨询关键词
  const policyKeywords = [
    // 问题类型
    '怎么办', '怎么处理', '如何处理', '怎么申请', '如何申请',
    '会怎么样', '有什么影响', '后果', '结果', '是什么', '有哪些',

    // 学业问题
    '挂科', '不及格', '补考', '重修', '退学', '休学', '复学',
    '转专业', '选课', '退课', '旷课', '迟到', '早退', '请假',

    // 奖惩问题
    '奖励', '处分', '违纪', '作弊', '记过', '警告',

    // 其他常见政策咨询
    '规定', '制度', '政策', '流程', '条件', '要求', '标准',
    '办理', '手续', '材料'
  ];

  const hasPolicyKeyword = policyKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasPolicyKeyword) {
    return 'document';
  }

  // 6. 一般数据库查询关键词
  const databaseKeywords = [
    '本人', '自己', '个人信息', '基本资料', '我的资料',
    '授课', '我授课', '我的授课', '授课班级', '我教的',
    '班级', '班级信息', '班级列表'
  ];

  const hasDatabaseKeyword = databaseKeywords.some(keyword =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasDatabaseKeyword) {
    return 'database';
  }

  // 7. 默认为普通聊天
  return 'chat';
};

// 测试用例
const testCases = [
  {
    question: '那我的学生挂科了会怎么办',
    expected: 'document',
    description: '老师询问学生挂科政策（修复后）'
  },
  {
    question: '我的成绩是多少',
    expected: 'database',
    description: '查询自己的成绩'
  },
  {
    question: '挂科了会怎么样',
    expected: 'document',
    description: '询问挂科后果'
  },
  {
    question: '我的学生',
    expected: 'chat',
    description: '没有明确意图（默认聊天）'
  },
  {
    question: '怎么申请奖学金',
    expected: 'document',
    description: '询问奖学金申请流程'
  },
  {
    question: '我的奖学金',
    expected: 'database',
    description: '查询自己的奖学金（明确数据库查询）'
  },
  {
    question: '转专业需要什么条件',
    expected: 'document',
    description: '询问转专业条件'
  },
  {
    question: '我的班级有哪些学生',
    expected: 'database',
    description: '查询班级学生列表'
  },
  {
    question: '学生违纪会怎么处理',
    expected: 'document',
    description: '询问违纪处理政策'
  },
  {
    question: '下载转专业申请表',
    expected: 'form_generate',
    description: '生成转专业申请表'
  }
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        意图识别测试 - 内师智能体系统出品 (￣▽￣)ﾉ             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  const result = detectIntent(testCase.question);
  const pass = result === testCase.expected;

  if (pass) {
    passCount++;
    console.log(`✅ 测试 ${index + 1}: 通过`);
  } else {
    failCount++;
    console.log(`❌ 测试 ${index + 1}: 失败`);
  }

  console.log(`   问题：${testCase.question}`);
  console.log(`   期望：${testCase.expected}`);
  console.log(`   实际：${result}`);
  console.log(`   说明：${testCase.description}\n`);
});

console.log('═'.repeat(70));
console.log(`📊 测试结果：`);
console.log(`  ✅ 通过：${passCount}/${testCases.length}`);
console.log(`  ❌ 失败：${failCount}/${testCases.length}`);
console.log(`  通过率：${(passCount / testCases.length * 100).toFixed(1)}%`);
console.log('═'.repeat(70));

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！意图识别器工作正常！');
} else {
  console.log(`\n⚠️  有 ${failCount} 个测试失败，需要进一步优化。`);
}
