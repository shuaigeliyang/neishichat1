require('dotenv').config();
const axios = require('axios');

async function testEmbedding() {
    console.log('测试Embedding API...');
    try {
        const response = await axios.post(
            'https://open.bigmodel.cn/api/paas/v4/embeddings',
            {
                model: 'embedding-3',
                input: '测试文本'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Embedding API 有效');
        console.log('向量维度:', response.data.data[0].embedding.length);
    } catch (error) {
        console.error('❌ Embedding API 失败:', error.response?.data || error.message);
    }
}

async function testChat() {
    console.log('\n测试Chat API...');
    try {
        const response = await axios.post(
            'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            {
                model: 'glm-4-flash',
                messages: [{ role: 'user', content: '你好' }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Chat API 有效');
        console.log('响应:', response.data.choices[0].message.content);
    } catch (error) {
        console.error('❌ Chat API 失败:', error.response?.data || error.message);
    }
}

(async () => {
    console.log('API Key:', process.env.ZHIPU_API_KEY);
    await testEmbedding();
    await testChat();
})();
