/**
 * Chat API 测试工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：测试智谱AI Chat API是否正常工作
 */

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_KEY = process.env.ZHIPU_API_KEY;
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL = 'glm-4-flash';

async function testChatAPI() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 测试 Chat API (glm-4-flash)');
    console.log('='.repeat(80));

    const testQuestions = [
        '重修需要什么条件？',
        '如何申请奖学金？',
        '学生违纪会怎么处理？'
    ];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i];
        console.log(`\n[${i + 1}/${testQuestions.length}] 测试问题: "${question}"`);

        try {
            const startTime = Date.now();

            const response = await axios.post(
                API_URL,
                {
                    model: MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: '你是学生助手，请基于学生手册回答问题。'
                        },
                        {
                            role: 'user',
                            content: question
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            const elapsed = Date.now() - startTime;
            const answer = response.data.choices[0].message.content;

            successCount++;
            console.log(`  ✅ 成功 | 耗时: ${elapsed}ms`);
            console.log(`  📝 回答: ${answer.substring(0, 100)}...`);

        } catch (error) {
            failCount++;
            console.log(`  ❌ 失败 | 状态码: ${error.response?.status || 'N/A'}`);
            console.log(`  🔍 错误: ${error.response?.data?.error?.message || error.message}`);

            if (error.response?.status === 429) {
                console.log(`  ⚠️  检测到限流错误！`);
            }
        }

        // 延迟1秒
        if (i < testQuestions.length - 1) {
            await sleep(1000);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 测试结果统计');
    console.log('='.repeat(80));
    console.log(`✅ 成功: ${successCount}/${testQuestions.length}`);
    console.log(`❌ 失败: ${failCount}/${testQuestions.length}`);

    if (failCount === 0) {
        console.log('\n🎉 Chat API 工作正常！');
    } else {
        console.log('\n⚠️  Chat API 存在问题，可能是导致500错误的原因！');
    }
    console.log('='.repeat(80) + '\n');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

testChatAPI();
