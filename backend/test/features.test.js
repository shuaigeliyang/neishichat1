/**
 * 功能测试脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：测试权限控制、上下文管理、表单下载等功能
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
let TEST_TOKEN = '';
let TEST_SESSION_ID = Date.now().toString();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'yellow');
  log(message, 'yellow');
  log('='.repeat(60), 'yellow');
}

// 测试1：用户登录
async function testLogin() {
  section('测试1：用户登录');

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'student1',
      password: '123456',
      type: 'student'
    });

    if (response.data.success) {
      TEST_TOKEN = response.data.data.token;
      success('登录成功！');
      info(`Token: ${TEST_TOKEN.substring(0, 20)}...`);
      return true;
    } else {
      error('登录失败');
      return false;
    }
  } catch (err) {
    error(`登录请求失败: ${err.message}`);
    return false;
  }
}

// 测试2：权限验证 - 学生查询自己的成绩
async function testQueryOwnGrades() {
  section('测试2：权限验证 - 学生查询自己的成绩');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: '查询我的成绩',
        sessionId: TEST_SESSION_ID
      },
      {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );

    if (response.data.success) {
      success('查询自己的成绩 - 权限验证通过');
      return true;
    } else {
      error('查询失败');
      return false;
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
    return false;
  }
}

// 测试3：下载权限验证 - 学生尝试下载学院信息
async function testDownloadPermission() {
  section('测试3：下载权限验证 - 学生尝试下载学院信息');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: '下载学院信息',
        sessionId: TEST_SESSION_ID
      },
      {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );

    const answer = JSON.parse(response.data.data.answer);

    if (answer.message && answer.message.includes('权限不足')) {
      success('下载权限验证正确 - 学生无法下载学院信息');
      return true;
    } else {
      error('权限验证失败 - 学生不应该能下载学院信息');
      return false;
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
    return false;
  }
}

// 测试4：上下文记忆 - 追问测试
async function testContextMemory() {
  section('测试4：上下文记忆 - 追问测试');

  try {
    // 第一轮对话
    info('第一轮：问"转专业需要什么条件？"');
    let response = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: '转专业需要什么条件？',
        sessionId: TEST_SESSION_ID
      },
      {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );

    // 第二轮对话 - 追问
    info('第二轮：追问"那具体怎么申请？"');
    response = await axios.post(
      `${BASE_URL}/api/chat`,
      {
        message: '那具体怎么申请？',
        sessionId: TEST_SESSION_ID
      },
      {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );

    if (response.data.success) {
      success('上下文记忆功能正常');
      return true;
    } else {
      error('上下文记忆功能异常');
      return false;
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
    return false;
  }
}

// 测试5：获取表单列表
async function testFormList() {
  section('测试5：获取表单列表');

  try {
    const response = await axios.get(`${BASE_URL}/api/forms/list`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    });

    if (response.data.success && response.data.data.length > 0) {
      success(`获取表单列表成功，共 ${response.data.data.length} 个表单`);
      info('表单列表：');
      response.data.data.forEach((form, index) => {
        log(`  ${index + 1}. ${form.template_name} (${form.category})`);
      });
      return true;
    } else {
      error('获取表单列表失败');
      return false;
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('\n========================================', 'yellow');
  log('  功能测试 - 学生教育系统智能体', 'yellow');
  log('  设计师：内师智能体系统 (￣▽￣)ﾉ', 'yellow');
  log('========================================\n', 'yellow');

  const results = [];

  // 运行所有测试
  results.push(await testLogin());

  if (TEST_TOKEN) {
    results.push(await testQueryOwnGrades());
    results.push(await testDownloadPermission());
    results.push(await testContextMemory());
    results.push(await testFormList());
  }

  // 总结
  section('测试总结');
  const passed = results.filter(r => r).length;
  const total = results.length;

  log(`\n通过: ${passed}/${total}`, passed === total ? 'green' : 'red');

  if (passed === total) {
    success('所有测试通过！🎉');
    log('\n系统功能正常，可以开始使用啦！', 'green');
  } else {
    error('部分测试失败，请检查相关功能');
  }

  log('\n========================================\n', 'yellow');
}

// 运行测试
runTests().catch(err => {
  error(`测试运行失败: ${err.message}`);
  process.exit(1);
});
