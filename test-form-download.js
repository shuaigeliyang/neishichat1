/**
 * 表单下载功能测试脚本
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 *
 * 使用方法：
 * 1. 修改下面的 BASE_URL 和 TOKEN
 * 2. 运行: node test-form-download.js
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://47.108.233.194'; // 或者 http://localhost:3000
const TOKEN = 'your-jwt-token-here'; // 替换为实际的JWT token

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) { log(`✅ ${message}`, 'green'); }
function error(message) { log(`❌ ${message}`, 'red'); }
function warn(message) { log(`⚠️  ${message}`, 'yellow'); }
function info(message) { log(`ℹ️  ${message}`, 'blue'); }

async function testHealthCheck() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('1️⃣  测试健康检查接口', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');

  try {
    const response = await axios.get(`${BASE_URL}/health`);
    success('健康检查通过');
    info(`响应: ${JSON.stringify(response.data)}`);
    return true;
  } catch (err) {
    error('健康检查失败');
    info(`错误: ${err.message}`);
    return false;
  }
}

async function testFormList() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('2️⃣  测试表单列表接口', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');

  try {
    const response = await axios.get(`${BASE_URL}/api/forms`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (response.data.success) {
      success('获取表单列表成功');
      info(`表单数量: ${response.data.data.length}`);
      response.data.data.forEach(form => {
        info(`  - ${form.template_name} (${form.category})`);
      });
      return true;
    } else {
      error('获取表单列表失败');
      info(`消息: ${response.data.message}`);
      return false;
    }
  } catch (err) {
    error('请求失败');
    info(`错误: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testFormGenerate() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('3️⃣  测试表单生成接口', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');

  try {
    const response = await axios.post(`${BASE_URL}/api/forms/generate`,
      { templateName: '竞赛申请表' },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    if (response.data.success) {
      success('表单生成成功');
      info(`文件名: ${response.data.data.fileName}`);
      info(`下载URL: ${response.data.data.downloadUrl}`);

      // 返回下载信息供下一步测试
      return {
        success: true,
        downloadUrl: response.data.data.downloadUrl,
        fileName: response.data.data.fileName
      };
    } else {
      error('表单生成失败');
      info(`消息: ${response.data.message}`);
      return { success: false };
    }
  } catch (err) {
    error('请求失败');
    info(`错误: ${err.response?.data?.message || err.message}`);
    return { success: false };
  }
}

async function testFormDownload(downloadUrl, fileName) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('4️⃣  测试表单下载接口', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');

  try {
    const response = await axios.get(`${BASE_URL}${downloadUrl}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      responseType: 'arraybuffer'
    });

    success('文件下载成功');
    info(`文件大小: ${response.data.length} bytes`);
    info(`Content-Type: ${response.headers['content-type']}`);

    // 检查是否是有效的docx文件
    const header = Buffer.from(response.data.slice(0, 4)).toString('hex');
    if (header === '504b0304') {
      success('文件格式验证通过 (ZIP/DOCX)');
    } else {
      warn('文件格式可能不正确');
      info(`文件头: ${header}`);
    }

    return true;
  } catch (err) {
    error('文件下载失败');
    info(`错误: ${err.response?.data?.message || err.message}`);
    info(`状态码: ${err.response?.status}`);

    // 详细错误分析
    if (err.response?.status === 404) {
      warn('文件不存在 - 可能原因：');
      info('  1. 文件生成后未保存到正确位置');
      info('  2. 文件路径配置错误');
      info('  3. 文件被清理或删除');
    } else if (err.response?.status === 403) {
      warn('权限不足 - 可能原因：');
      info('  1. JWT token无效或过期');
      info('  2. 文件权限不足');
    } else if (err.response?.status === 401) {
      warn('未授权 - 请检查JWT token是否正确');
    }

    return false;
  }
}

async function testCORS() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('5️⃣  测试CORS配置', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');

  try {
    const response = await axios.options(`${BASE_URL}/api/forms`, {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });

    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      success('CORS已配置');
      info(`Access-Control-Allow-Origin: ${corsHeaders}`);
    } else {
      warn('未检测到CORS头');
      info('可能需要配置: CORS_ORIGIN=*');
    }
    return true;
  } catch (err) {
    warn('CORS测试跳过 (OPTIONS请求被阻止)');
    return false;
  }
}

async function runTests() {
  log('\n=========================================', 'blue');
  log('  表单下载功能测试工具');
  log('  作者：内师智能体系统 (￣▽￣)ﾉ', 'blue');
  log('=========================================', 'blue');
  log(`测试地址: ${BASE_URL}`, 'blue');
  log('=========================================', 'blue');

  if (TOKEN === 'your-jwt-token-here') {
    error('请先修改脚本中的TOKEN变量');
    info('获取方式: 登录后从浏览器开发者工具中复制JWT token');
    process.exit(1);
  }

  const results = {
    healthCheck: false,
    formList: false,
    formGenerate: false,
    formDownload: false,
    cors: false
  };

  // 运行测试
  results.healthCheck = await testHealthCheck();

  if (results.healthCheck) {
    results.formList = await testFormList();

    if (results.formList) {
      const generateResult = await testFormGenerate();

      if (generateResult.success) {
        results.formGenerate = true;
        results.formDownload = await testFormDownload(
          generateResult.downloadUrl,
          generateResult.fileName
        );
      }
    }
  }

  await testCORS();

  // 总结
  log('\n=========================================', 'blue');
  log('  测试结果总结', 'blue');
  log('=========================================', 'blue');

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    success('所有测试通过！✨');
    info('表单下载功能正常工作');
  } else {
    warn('部分测试失败');
    info('请查看上面的错误信息进行修复');
    info('\n建议操作：');
    info('1. 运行诊断脚本: bash check-form-download.sh');
    info('2. 运行修复脚本: bash fix-form-download.sh');
    info('3. 查看详细文档: FORM_DOWNLOAD_FIX_GUIDE.md');
  }

  log('\n测试详情：', 'blue');
  log(`  健康检查:  ${results.healthCheck ? '✅' : '❌'}`, results.healthCheck ? 'green' : 'red');
  log(`  表单列表:  ${results.formList ? '✅' : '❌'}`, results.formList ? 'green' : 'red');
  log(`  表单生成:  ${results.formGenerate ? '✅' : '❌'}`, results.formGenerate ? 'green' : 'red');
  log(`  表单下载:  ${results.formDownload ? '✅' : '❌'}`, results.formDownload ? 'green' : 'red');
  log(`  CORS配置:  ${results.cors ? '✅' : '⚠️ '}`, results.cors ? 'green' : 'yellow');

  log('\n=========================================', 'blue');
  log('  测试完成！', 'blue');
  log('=========================================\n', 'blue');
}

// 运行测试
runTests().catch(err => {
  error(`测试过程出错: ${err.message}`);
  console.error(err);
  process.exit(1);
});
