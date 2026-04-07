/**
 * Embedding服务对比测试
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：对比API Embedding和本地Embedding的性能
 */

const dotenv = require('dotenv');
const EmbeddingService = require('./services/embeddingService');
const LocalEmbeddingService = require('./services/localEmbeddingService');

dotenv.config();

// 测试文本列表
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

async function testAPIService() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试智谱AI Embedding API');
    console.log('='.repeat(80));

    const apiService = new EmbeddingService(process.env.ZHIPU_API_KEY);
    const results = [];

    for (let i = 0; i < TEST_TEXTS.length; i++) {
        const text = TEST_TEXTS[i];
        console.log(`\n[${i + 1}/${TEST_TEXTS.length}] 处理：${text}`);

        try {
            const startTime = Date.now();
            const embedding = await apiService.getEmbedding(text);
            const elapsed = Date.now() - startTime;

            results.push({
                text,
                success: true,
                elapsed,
                dimension: embedding.length
            });

            console.log(`  ✅ 成功 | 耗时：${elapsed}ms | 维度：${embedding.length}`);

            // 避免请求过快
            if (i < TEST_TEXTS.length - 1) {
                await apiService.sleep(500);
            }

        } catch (error) {
            results.push({
                text,
                success: false,
                error: error.message
            });

            console.log(`  ❌ 失败 | ${error.message}`);

            // 如果是限流错误，停止测试
            if (error.response?.status === 429) {
                console.log('\n⚠️  检测到限流，停止测试');
                break;
            }
        }
    }

    // 计算统计信息
    const successResults = results.filter(r => r.success);
    const avgTime = successResults.length > 0
        ? Math.round(successResults.reduce((sum, r) => sum + r.elapsed, 0) / successResults.length)
        : 0;

    console.log('\n📊 API服务统计：');
    console.log(`   成功：${successResults.length}/${results.length}`);
    console.log(`   失败：${results.length - successResults.length}/${results.length}`);
    console.log(`   平均耗时：${avgTime}ms`);
    console.log(`   总耗时：${successResults.reduce((sum, r) => sum + r.elapsed, 0)}ms`);

    return {
        type: 'API',
        successCount: successResults.length,
        totalCount: results.length,
        avgTime,
        totalTime: successResults.reduce((sum, r) => sum + r.elapsed, 0)
    };
}

async function testLocalService() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试本地Embedding服务');
    console.log('='.repeat(80));

    const localService = new LocalEmbeddingService();
    const results = [];

    for (let i = 0; i < TEST_TEXTS.length; i++) {
        const text = TEST_TEXTS[i];
        console.log(`\n[${i + 1}/${TEST_TEXTS.length}] 处理：${text}`);

        try {
            const startTime = Date.now();
            const embedding = await localService.getEmbedding(text);
            const elapsed = Date.now() - startTime;

            results.push({
                text,
                success: true,
                elapsed,
                dimension: embedding.length
            });

            console.log(`  ✅ 成功 | 耗时：${elapsed}ms | 维度：${embedding.length}`);

        } catch (error) {
            results.push({
                text,
                success: false,
                error: error.message
            });

            console.log(`  ❌ 失败 | ${error.message}`);
        }
    }

    // 计算统计信息
    const successResults = results.filter(r => r.success);
    const avgTime = successResults.length > 0
        ? Math.round(successResults.reduce((sum, r) => sum + r.elapsed, 0) / successResults.length)
        : 0;

    console.log('\n📊 本地服务统计：');
    console.log(`   成功：${successResults.length}/${results.length}`);
    console.log(`   失败：${results.length - successResults.length}/${results.length}`);
    console.log(`   平均耗时：${avgTime}ms`);
    console.log(`   总耗时：${successResults.reduce((sum, r) => sum + r.elapsed, 0)}ms`);

    // 释放资源
    await localService.dispose();

    return {
        type: 'Local',
        successCount: successResults.length,
        totalCount: results.length,
        avgTime,
        totalTime: successResults.reduce((sum, r) => sum + r.elapsed, 0)
    };
}

async function main() {
    console.log('\n' + '🔥'.repeat(40));
    console.log('🔥 Embedding服务对比测试');
    console.log('🔥 设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('🔥'.repeat(40));

    console.log(`\n📋 测试配置：`);
    console.log(`   测试文本数量：${TEST_TEXTS.length}`);
    console.log(`   API Key：${process.env.ZHIPU_API_KEY ? '已配置' : '未配置'}`);

    try {
        // 测试本地服务（先测试本地，因为API可能会限流）
        const localResults = await testLocalService();

        // 测试API服务
        const apiResults = await testAPIService();

        // 对比结果
        console.log('\n' + '='.repeat(80));
        console.log('📊 对比结果总结');
        console.log('='.repeat(80));

        console.log('\n🔥 成功率对比：');
        console.log(`   本地服务：${localResults.successCount}/${localResults.totalCount} (${(localResults.successCount / localResults.totalCount * 100).toFixed(1)}%)`);
        console.log(`   API服务：${apiResults.successCount}/${apiResults.totalCount} (${(apiResults.successCount / apiResults.totalCount * 100).toFixed(1)}%)`);

        console.log('\n⏱️  性能对比：');
        console.log(`   本地服务平均：${localResults.avgTime}ms`);
        console.log(`   API服务平均：${apiResults.avgTime}ms`);

        if (localResults.avgTime > 0 && apiResults.avgTime > 0) {
            const speedup = apiResults.avgTime / localResults.avgTime;
            console.log(`   速度比：${speedup.toFixed(1)}x ${speedup > 1 ? '(本地更快)' : '(API更快)'}`);
        }

        console.log('\n⏱️  总耗时对比：');
        console.log(`   本地服务：${localResults.totalTime}ms (${(localResults.totalTime / 1000).toFixed(1)}s)`);
        console.log(`   API服务：${apiResults.totalTime}ms (${(apiResults.totalTime / 1000).toFixed(1)}s)`);

        console.log('\n💰 成本对比：');
        console.log(`   本地服务：完全免费 ✅`);
        console.log(`   API服务：需要付费（20元/5000万tokens）`);

        console.log('\n🎯 结论：');
        if (localResults.successCount > apiResults.successCount) {
            console.log('   ✅ 推荐使用本地服务！成功率更高，且完全免费！');
        } else if (localResults.avgTime < apiResults.avgTime) {
            console.log('   ✅ 推荐使用本地服务！速度更快，且完全免费！');
        } else {
            console.log('   💡 建议：优先使用本地服务，API作为备选！');
        }

        console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ 测试失败：', error);
        process.exit(1);
    }
}

// 运行测试
main();
