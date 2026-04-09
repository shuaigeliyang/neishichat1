/**
 * 直接测试RAG功能
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testRAG() {
    console.log('='.repeat(60));
    console.log('RAG功能直接测试');
    console.log('设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('='.repeat(60));

    try {
        // 步骤1：登录获取token
        console.log('\n✓ 步骤1：登录...');
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
            username: 'S2201001',
            password: '123456'
        });

        const token = loginResponse.data.data.token;
        console.log('✓ 登录成功！Token:', token.substring(0, 20) + '...');

        // 步骤2：测试RAG问答
        const testQuestions = [
            '我挂科了怎么办',
            '如何申请奖学金？',
            '转专业的流程是什么？',
            '重修需要什么条件？'
        ];

        console.log('\n✓ 步骤2：测试RAG问答...\n');

        for (const question of testQuestions) {
            console.log('\n' + '-'.repeat(60));
            console.log(`【问题】${question}`);
            console.log('-'.repeat(60));

            try {
                const ragResponse = await axios.post(
                    `${API_BASE}/api/rag/answer`,
                    { question },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (ragResponse.data.success) {
                    const result = ragResponse.data.data;

                    console.log('\n【回答】');
                    console.log(result.answer ? result.answer.substring(0, 300) + '...' : '无回答');

                    if (result.sources && result.sources.length > 0) {
                        console.log('\n【来源】');
                        result.sources.forEach((source, index) => {
                            console.log(`  ${index + 1}. ${source.chapter} | 相似度:${source.score?.toFixed(3) || 'N/A'}`);
                        });
                    }

                    console.log(`\n【统计】置信度:${result.confidence?.toFixed(3) || 'N/A'} | 耗时:${result.elapsed || 0}ms`);
                } else {
                    console.log('\n❌ RAG请求失败：', ragResponse.data.error);
                }

            } catch (error) {
                console.log('\n❌ 请求异常：', error.response?.data || error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✓ 测试完成！');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n✗ 测试失败：', error.message);
        if (error.response) {
            console.error('响应数据：', error.response.data);
        }
        process.exit(1);
    }
}

// 运行测试
testRAG().catch(error => {
    console.error('✗ 程序异常：', error);
    process.exit(1);
});
