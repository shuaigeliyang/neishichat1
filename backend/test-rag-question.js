/**
 * 测试单个RAG问题
 */

const axios = require('axios');

async function testSingleQuestion() {
    try {
        // 登录
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'S2201001',
            password: '123456'
        });

        const token = loginResponse.data.data.token;
        console.log('✓ 登录成功');

        // 测试RAG问题
        console.log('\n✓ 测试问题：我挂科了怎么办\n');

        const ragResponse = await axios.post(
            'http://localhost:3000/api/rag/answer',
            { question: '我挂科了怎么办' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log('✓ RAG请求成功');
        console.log('Sources数量:', ragResponse.data.data.sources.length);
        console.log('Sources页码:', ragResponse.data.data.sources.map(s => s.page).join(', '));

    } catch (error) {
        console.error('\n✗ 请求失败');
        console.error('错误消息:', error.message);
        console.error('错误代码:', error.code);
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', error.response.data);
        } else if (error.request) {
            console.error('请求已发送但无响应');
        } else {
            console.error('请求配置错误:', error.config);
        }
        console.error('完整错误:', error);
    }
}

testSingleQuestion();
