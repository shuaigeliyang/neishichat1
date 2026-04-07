/**
 * 本地Embedding服务测试工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：测试本地embedding服务的性能和效果
 */

const LocalEmbeddingService = require('./services/localEmbeddingService');

async function testLocalEmbedding() {
    console.log('\n' + '🔥'.repeat(40));
    console.log('🔥 本地Embedding服务测试');
    console.log('🔥 设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('🔥'.repeat(40) + '\n');

    const localService = new LocalEmbeddingService();

    try {
        // 测试1：单个文本向量化
        console.log('📝 测试1：单个文本向量化');
        console.log('='.repeat(80));
        const testText = '重修管理办法';
        console.log(`测试文本：${testText}`);

        const startTime = Date.now();
        const embedding = await localService.getEmbedding(testText);
        const elapsed = Date.now() - startTime;

        console.log(`✅ 成功！`);
        console.log(`   向量维度：${embedding.length}`);
        console.log(`   耗时：${elapsed}ms`);
        console.log(`   前5个值：[${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

        // 测试2：批量向量化
        console.log('\n📝 测试2：批量向量化');
        console.log('='.repeat(80));
        const testTexts = [
            '重修管理办法',
            '奖学金申请流程',
            '学生违纪处分条例',
            '课程补考规定',
            '转专业申请条件'
        ];

        console.log(`测试文本数量：${testTexts.length}`);
        const batchStartTime = Date.now();

        const embeddings = await localService.getBatchEmbeddings(testTexts);

        const batchElapsed = Date.now() - batchStartTime;
        console.log(`✅ 批量向量化完成！`);
        console.log(`   总耗时：${batchElapsed}ms`);
        console.log(`   平均耗时：${(batchElapsed / testTexts.length).toFixed(0)}ms/个`);

        // 测试3：相似度计算
        console.log('\n📝 测试3：相似度计算');
        console.log('='.repeat(80));

        const queryText = '课程重修';
        console.log(`查询文本：${queryText}`);

        const queryEmbedding = await localService.getEmbedding(queryText);

        const comparisons = [
            { text: '重修管理办法', embedding: embeddings[0] },
            { text: '奖学金申请流程', embedding: embeddings[1] },
            { text: '课程补考规定', embedding: embeddings[3] }
        ];

        console.log('\n相似度比较：');
        comparisons.forEach(({ text, embedding }) => {
            const similarity = localService.cosineSimilarity(queryEmbedding, embedding);
            console.log(`   "${queryText}" vs "${text}": ${similarity.toFixed(4)}`);
        });

        // 测试4：缓存测试
        console.log('\n📝 测试4：缓存测试');
        console.log('='.repeat(80));

        const cacheTestText = '重修管理办法';
        console.log(`测试文本：${cacheTestText}（已缓存）`);

        const cacheStartTime = Date.now();
        await localService.getEmbedding(cacheTestText);
        const cacheElapsed = Date.now() - cacheStartTime;

        console.log(`✅ 缓存命中！`);
        console.log(`   耗时：${cacheElapsed}ms`);
        console.log(`   加速比：${(elapsed / cacheElapsed).toFixed(1)}x`);

        // 测试5：统计信息
        console.log('\n📝 测试5：统计信息');
        console.log('='.repeat(80));

        const stats = localService.getCacheStats();
        console.log(`缓存条目数：${stats.size}`);
        console.log(`内存使用：${stats.memoryUsage.toFixed(2)} MB`);
        console.log(`模型已加载：${stats.modelLoaded ? '是' : '否'}`);
        console.log(`向量维度：${stats.dimension}`);

        // 释放资源
        await localService.dispose();

        console.log('\n' + '='.repeat(80));
        console.log('✅ 所有测试通过！');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ 测试失败：', error.message);
        console.error(error);
        await localService.dispose();
        process.exit(1);
    }
}

// 运行测试
testLocalEmbedding();
