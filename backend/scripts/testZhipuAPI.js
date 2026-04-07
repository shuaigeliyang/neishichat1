/**
 * 智谱AI API测试脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 用法：node testZhipuAPI.js
 */

const axios = require('axios');

// 从.env读取配置（修正路径）
require('dotenv').config({ path: __dirname.slice(0, -7) + '/.env' });

const API_KEY = process.env.ZHIPU_API_KEY;
const API_BASE = process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
const MODEL = process.env.ZHIPU_MODEL || 'glm-4-flash';

console.log('🔍 智谱AI API测试');
console.log('='.repeat(60));
console.log('API Key:', API_KEY ? API_KEY.substring(0, 20) + '...' : '未配置');
console.log('API Base:', API_BASE);
console.log('Model:', MODEL);
console.log('='.repeat(60));

async function testAPI() {
  try {
    console.log('\n1️⃣ 发送测试请求到智谱AI...\n');

    const response = await axios.post(
      `${API_BASE}/chat/completions`,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个友好的助手。'
          },
          {
            role: 'user',
            content: '你好，请简单介绍一下自己。'
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 10000
      }
    );

    console.log('✅ API调用成功！\n');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const answer = response.data.choices[0].message.content;
      console.log('\n📝 AI回复:');
      console.log('-'.repeat(60));
      console.log(answer);
      console.log('-'.repeat(60));
      console.log('\n✨ 测试成功！智谱API可以正常使用！\n');

      // 显示使用情况
      if (response.data.usage) {
        console.log('📊 Token使用情况:');
        console.log('   - 输入Token:', response.data.usage.prompt_tokens || 0);
        console.log('   - 输出Token:', response.data.usage.completion_tokens || 0);
        console.log('   - 总计Token:', response.data.usage.total_tokens || 0);
      }
    } else {
      console.log('❌ 响应格式不正确');
    }

  } catch (error) {
    console.log('\n❌ API调用失败！\n');
    console.log('错误代码:', error.code);
    console.log('错误信息:', error.message);

    if (error.response) {
      console.log('\n📋 详细错误信息:');
      console.log('状态码:', error.response.status);
      console.log('响应数据:', JSON.stringify(error.response.data, null, 2));

      // 分析具体错误
      if (error.response.status === 401) {
        console.log('\n💡 分析: 认证失败 (401)');
        console.log('   可能原因:');
        console.log('   - API Key错误');
        console.log('   - API Key已过期');
        console.log('   解决方案: 请检查.env文件中的ZHIPU_API_KEY是否正确');
      } else if (error.response.status === 429) {
        console.log('\n💡 分析: 请求过于频繁 (429)');
        console.log('   可能原因: QPS超限');
        console.log('   解决方案: 等待一段时间后再试');
      } else if (error.response.status === 400) {
        console.log('\n💡 分析: 请求格式错误 (400)');
        console.log('   可能原因: 请求参数格式不正确');
        console.log('   响应详情:', error.response.data);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 分析: 无法连接到服务器');
      console.log('   可能原因:');
      console.log('   - 网络连接问题');
      console.log('   - API服务地址不正确');
      console.log('   解决方案: 检查网络连接和API_BASE配置');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 分析: API地址不正确');
      console.log('   当前API_BASE:', API_BASE);
      console.log('   解决方案: 检查.env文件中的ZHIPU_API_BASE配置');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

testAPI();
