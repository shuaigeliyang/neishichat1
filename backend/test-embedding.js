/**
 * 测试智谱AI Embedding API
 */

const axios = require('axios');
require('dotenv').config();

async function testEmbedding() {
  const apiKey = process.env.ZHIPU_API_KEY;
  const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/embeddings';

  console.log('✓ 测试智谱AI Embedding API\n');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 20) + '...' : 'undefined'}`);
  console.log(`API URL: ${apiUrl}\n`);

  try {
    console.log('发送请求...');
    const response = await axios.post(
      apiUrl,
      {
        model: 'embedding-3',
        input: '测试文本'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('\n✅ 请求成功！');
    console.log('状态码：', response.status);
    console.log('响应数据：', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ 请求失败！');
    console.error('状态码：', error.response?.status);
    console.error('错误数据：', JSON.stringify(error.response?.data, null, 2));
    console.error('错误消息：', error.message);
  }
}

testEmbedding();
