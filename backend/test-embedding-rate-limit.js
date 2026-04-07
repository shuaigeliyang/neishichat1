/**
 * Embedding API 限流测试工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：全面测试智谱AI Embedding API的限流情况
 */

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// 配置
const API_KEY = process.env.ZHIPU_API_KEY;
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/embeddings';
const MODEL = 'embedding-3';

// 测试文本列表（模拟真实场景）
const TEST_TEXTS = [
    '重修管理办法',
    '奖学金申请流程',
    '学生违纪处分条例',
    '课程补考规定',
    '转专业申请条件',
    '学生考勤管理制度',
    '学费缴纳标准',
    '宿舍管理规定',
    '毕业论文要求',
    '学生申诉流程'
];

/**
 * 单次embedding调用
 */
async function callEmbedding(text, index) {
    const startTime = Date.now();

    try {
        const response = await axios.post(
            API_URL,
            {
                model: MODEL,
                input: text
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const elapsed = Date.now() - startTime;
        const embedding = response.data.data[0].embedding;

        return {
            index,
            success: true,
            status: response.status,
            elapsed,
            dimension: embedding.length,
            tokens: response.data.usage?.total_tokens || 'N/A',
            error: null
        };

    } catch (error) {
        const elapsed = Date.now() - startTime;

        return {
            index,
            success: false,
            status: error.response?.status || 'N/A',
            elapsed,
            error: error.response?.data?.error?.message || error.message,
            errorCode: error.response?.data?.error?.code || 'N/A'
        };
    }
}

/**
 * 顺序测试（逐个调用）
 */
async function testSequential(count = 10, delay = 1000) {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 测试模式：顺序调用 (共${count}次，间隔${delay}ms)`);
    console.log('='.repeat(80));

    const results = [];

    for (let i = 0; i < count; i++) {
        const text = TEST_TEXTS[i % TEST_TEXTS.length];
        console.log(`\n[${i + 1}/${count}] 调用中... 文本: "${text}"`);

        const result = await callEmbedding(text, i);
        results.push(result);

        if (result.success) {
            console.log(`  ✅ 成功 | 状态码: ${result.status} | 耗时: ${result.elapsed}ms | 维度: ${result.dimension}`);
        } else {
            console.log(`  ❌ 失败 | 状态码: ${result.status} | 错误: ${result.error}`);
        }

        // 延迟（除了最后一次）
        if (i < count - 1) {
            await sleep(delay);
        }
    }

    return results;
}

/**
 * 并发测试（同时调用）
 */
async function testConcurrent(batchSize = 5) {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 测试模式：并发调用 (批量大小: ${batchSize})`);
    console.log('='.repeat(80));

    const promises = [];
    for (let i = 0; i < batchSize; i++) {
        const text = TEST_TEXTS[i % TEST_TEXTS.length];
        console.log(`[${i + 1}/${batchSize}] 提交请求... 文本: "${text}"`);
        promises.push(callEmbedding(text, i));
    }

    console.log('\n⏳ 等待所有请求完成...');
    const results = await Promise.all(promises);

    results.forEach((result, index) => {
        if (result.success) {
            console.log(`  [${index + 1}] ✅ 成功 | 耗时: ${result.elapsed}ms`);
        } else {
            console.log(`  [${index + 1}] ❌ 失败 | 状态码: ${result.status} | 错误: ${result.error}`);
        }
    });

    return results;
}

/**
 * 压力测试（快速连续调用）
 */
async function testStress(count = 20, delay = 100) {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 测试模式：压力测试 (共${count}次，间隔${delay}ms - 高频调用)`);
    console.log('='.repeat(80));

    const results = [];

    for (let i = 0; i < count; i++) {
        const text = TEST_TEXTS[i % TEST_TEXTS.length];
        console.log(`\n[${i + 1}/${count}] 调用中...`);

        const result = await callEmbedding(text, i);
        results.push(result);

        if (result.success) {
            console.log(`  ✅ 成功 | 耗时: ${result.elapsed}ms`);
        } else {
            console.log(`  ❌ 失败 | 状态码: ${result.status} | 错误: ${result.error}`);

            // 如果是429限流错误，停止测试
            if (result.status === 429) {
                console.log('\n⚠️  检测到限流错误 (429)，停止测试');
                break;
            }
        }

        // 延迟
        if (i < count - 1) {
            await sleep(delay);
        }
    }

    return results;
}

/**
 * 分析结果
 */
function analyzeResults(results, testName) {
    console.log('\n' + '='.repeat(80));
    console.log(`📈 ${testName} - 测试结果分析`);
    console.log('='.repeat(80));

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const rateLimited = results.filter(r => r.status === 429).length;

    const successTimes = results.filter(r => r.success).map(r => r.elapsed);
    const avgTime = successTimes.length > 0
        ? Math.round(successTimes.reduce((a, b) => a + b, 0) / successTimes.length)
        : 0;
    const minTime = successTimes.length > 0 ? Math.min(...successTimes) : 0;
    const maxTime = successTimes.length > 0 ? Math.max(...successTimes) : 0;

    console.log(`✅ 成功次数: ${successCount}/${results.length}`);
    console.log(`❌ 失败次数: ${failCount}/${results.length}`);
    console.log(`⚠️  限流次数 (429): ${rateLimited}`);
    console.log(`\n⏱️  响应时间统计:`);
    console.log(`   - 平均: ${avgTime}ms`);
    console.log(`   - 最快: ${minTime}ms`);
    console.log(`   - 最慢: ${maxTime}ms`);

    // 错误分类
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
        console.log(`\n🔍 错误详情:`);
        const errorGroups = {};
        errors.forEach(e => {
            const key = `${e.status} - ${e.errorCode || 'Unknown'}`;
            if (!errorGroups[key]) {
                errorGroups[key] = [];
            }
            errorGroups[key].push(e);
        });

        Object.entries(errorGroups).forEach(([key, items]) => {
            console.log(`   - ${key}: ${items.length}次`);
            console.log(`     错误信息: ${items[0].error}`);
        });
    }

    // 限流判断
    console.log(`\n🎯 限流判断:`);
    if (rateLimited > 0) {
        console.log(`   ⚠️  检测到限流！API可能存在频率限制`);
        console.log(`   建议: 降低请求频率或增加请求间隔`);
    } else if (failCount > 0) {
        console.log(`   ❌ 存在其他错误，可能是API Key或账户问题`);
    } else {
        console.log(`   ✅ 未检测到限流，API调用正常`);
    }

    return {
        successRate: (successCount / results.length * 100).toFixed(2),
        rateLimited: rateLimited > 0,
        avgTime
    };
}

/**
 * 延时函数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主测试流程
 */
async function main() {
    console.log('\n' + '🔥'.repeat(40));
    console.log('🔥 智谱AI Embedding API 限流测试工具');
    console.log('🔥 设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('🔥'.repeat(40));

    console.log(`\n📋 测试配置:`);
    console.log(`   API URL: ${API_URL}`);
    console.log(`   模型: ${MODEL}`);
    console.log(`   API Key: ${API_KEY ? API_KEY.substring(0, 20) + '...' : '未设置'}`);

    if (!API_KEY) {
        console.error('\n❌ 错误: 未找到ZHIPU_API_KEY环境变量');
        console.log('请在backend/.env文件中配置API Key');
        process.exit(1);
    }

    try {
        // 1. 顺序测试
        const sequentialResults = await testSequential(10, 1000);
        const seqAnalysis = analyzeResults(sequentialResults, '顺序测试');

        await sleep(2000); // 等待2秒

        // 2. 并发测试
        const concurrentResults = await testConcurrent(5);
        const conAnalysis = analyzeResults(concurrentResults, '并发测试');

        await sleep(2000); // 等待2秒

        // 3. 压力测试（仅在前面测试通过时执行）
        if (!seqAnalysis.rateLimited && !conAnalysis.rateLimited) {
            console.log('\n💡 提示: 前两项测试未检测到限流，开始压力测试...');
            const stressResults = await testStress(20, 100);
            analyzeResults(stressResults, '压力测试');
        } else {
            console.log('\n⚠️  提示: 检测到限流，跳过压力测试以避免进一步限制');
        }

        // 总结
        console.log('\n' + '='.repeat(80));
        console.log('📊 测试总结');
        console.log('='.repeat(80));
        console.log('本小姐的测试已完成！请查看上方的详细结果分析');
        console.log('如果检测到限流，请考虑：');
        console.log('  1. 降低请求频率');
        console.log('  2. 实现请求队列和重试机制');
        console.log('  3. 增加本地缓存');
        console.log('  4. 联系智谱AI提升API配额');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ 测试过程发生错误:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// 运行测试
main();
