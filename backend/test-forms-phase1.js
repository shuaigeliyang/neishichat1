/**
 * 第一阶段表单功能测试脚本
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 * 用途：测试第一阶段13个已实现表单的生成功能
 */

const axios = require('axios');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TOKEN || 'your-jwt-token-here';

// 第一阶段13个已实现的表单
const PHASE1_FORMS = [
  { name: '学科竞赛参赛申请表', category: '申请表', keywords: ['竞赛'] },
  { name: '转专业申请表', category: '申请表', keywords: ['转专业'] },
  { name: '奖学金申请表', category: '申请表', keywords: ['奖学金'] },
  { name: '休学申请表', category: '申请表', keywords: ['休学'] },
  { name: '复学申请表', category: '申请表', keywords: ['复学'] },
  { name: '请假申请表', category: '申请表', keywords: ['请假'] },
  { name: '贫困生认定申请表', category: '申请表', keywords: ['贫困生', '困难'] },
  { name: '助学金申请表', category: '申请表', keywords: ['助学金'] },
  { name: '助学贷款申请表', category: '申请表', keywords: ['助学贷款'] },
  { name: '成绩证明申请表', category: '证明表', keywords: ['成绩证明'] },
  { name: '在读证明申请表', category: '证明表', keywords: ['在读证明'] },
  { name: '毕业证明申请表', category: '证明表', keywords: ['毕业证明'] },
  { name: '学位证明申请表', category: '证明表', keywords: ['学位证明'] }
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) { log(`✅ ${message}`, 'green'); }
function error(message) { log(`❌ ${message}`, 'red'); }
function warn(message) { log(`⚠️  ${message}`, 'yellow'); }
function info(message) { log(`ℹ️  ${message}`, 'blue'); }
function title(message) { log(message, 'cyan'); }

/**
 * 测试健康检查
 */
async function testHealthCheck() {
  title('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  title('1️⃣  测试后端健康检查');
  title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const response = await axios.get(`${BASE_URL}/health`);
    success('后端服务正常运行');
    info(`响应: ${JSON.stringify(response.data)}`);
    return true;
  } catch (err) {
    error('后端服务未运行或无法访问');
    info(`错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试表单列表
 */
async function testFormList() {
  title('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  title('2️⃣  测试表单列表接口');
  title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const response = await axios.get(`${BASE_URL}/api/forms`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (response.data.success && response.data.data) {
      const forms = response.data.data;
      success(`获取表单列表成功，共 ${forms.length} 个表单`);

      // 检查是否包含第一阶段的所有表单
      const formNames = forms.map(f => f.template_name);
      const missingForms = PHASE1_FORMS.filter(f => !formNames.includes(f.name));

      if (missingForms.length > 0) {
        warn('部分第一阶段表单未在数据库中：');
        missingForms.forEach(f => info(`  - ${f.name}`));
      } else {
        success('所有第一阶段表单都已存在于数据库中！');
      }

      // 按分类统计
      const byCategory = forms.reduce((acc, form) => {
        acc[form.category] = (acc[form.category] || 0) + 1;
        return acc;
      }, {});

      info('分类统计：');
      Object.entries(byCategory).forEach(([cat, count]) => {
        info(`  ${cat}: ${count}个`);
      });

      return true;
    } else {
      error('获取表单列表失败');
      return false;
    }
  } catch (err) {
    error('请求失败');
    info(`错误: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

/**
 * 测试单个表单生成
 */
async function testSingleForm(form) {
  try {
    const response = await axios.post(`${BASE_URL}/api/forms/generate`,
      { templateName: form.name },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    if (response.data.success) {
      success(`${form.name} - 生成成功`);
      info(`  文件: ${response.data.data.fileName}`);
      return true;
    } else {
      warn(`${form.name} - 生成失败: ${response.data.message}`);
      return false;
    }
  } catch (err) {
    error(`${form.name} - 请求失败`);
    info(`  错误: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

/**
 * 测试所有第一阶段表单生成
 */
async function testAllForms() {
  title('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  title('3️⃣  测试所有第一阶段表单生成');
  title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let successCount = 0;
  let failCount = 0;

  for (const form of PHASE1_FORMS) {
    const result = await testSingleForm(form);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  title('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  title('📊 测试结果统计');
  title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  success(`成功: ${successCount}/${PHASE1_FORMS.length}`);
  if (failCount > 0) {
    error(`失败: ${failCount}/${PHASE1_FORMS.length}`);
  }

  return successCount === PHASE1_FORMS.length;
}

/**
 * 生成测试报告
 */
function generateReport(results) {
  title('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  title('📋 第一阶段表单测试报告');
  title('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  title('\n【已实现的表单清单】');
  PHASE1_FORMS.forEach((form, index) => {
    const status = results.formResults?.[index] ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${form.name} (${form.category})`);
  });

  title('\n【测试统计】');
  console.log(`总表单数: ${PHASE1_FORMS.length}`);
  console.log(`测试通过: ${results.successCount || 0}`);
  console.log(`测试失败: ${results.failCount || 0}`);
  console.log(`成功率: ${((results.successCount || 0) / PHASE1_FORMS.length * 100).toFixed(1)}%`);

  if ((results.successCount || 0) === PHASE1_FORMS.length) {
    success('\n🎉 所有测试通过！第一阶段表单功能正常！');
  } else {
    warn('\n⚠️  部分测试失败，请检查错误日志');
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  title('\n=========================================');
  title('  第一阶段表单功能测试工具');
  title('  作者：内师智能体系统 (￣▽￣)ﾉ');
  title('=========================================');
  info(`测试地址: ${BASE_URL}`);
  info(`表单数量: ${PHASE1_FORMS.length}`);
  title('=========================================');

  if (TOKEN === 'your-jwt-token-here') {
    error('请先设置TOKEN环境变量！');
    info('使用方法: TOKEN=your_token node test-forms-phase1.js');
    process.exit(1);
  }

  const results = {
    formResults: [],
    successCount: 0,
    failCount: 0
  };

  // 运行测试
  const healthCheck = await testHealthCheck();

  if (healthCheck) {
    await testFormList();
    const allPassed = await testAllForms();

    results.successCount = allPassed ? PHASE1_FORMS.length : PHASE1_FORMS.length - 1;
    results.failCount = allPassed ? 0 : 1;
  }

  // 生成报告
  generateReport(results);

  title('\n=========================================');
  title('  测试完成！');
  title('=========================================\n');

  process.exit(results.successCount === PHASE1_FORMS.length ? 0 : 1);
}

// 运行测试
runTests().catch(err => {
  error(`测试过程出错: ${err.message}`);
  console.error(err);
  process.exit(1);
});
