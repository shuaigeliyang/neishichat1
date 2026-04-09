/**
 * 新RAG系统测试工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

require('dotenv').config();
const RAGService = require('./services/ragService');

async function testRAG() {
    console.log('='.repeat(60));
    console.log('RAG系统测试');
    console.log('设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('='.repeat(60));

    const ragService = new RAGService(process.env.ZHIPU_API_KEY, {
        embeddingMode: process.env.EMBEDDING_MODE || 'api'
    });

    try {
        // 初始化
        console.log('\n✓ 正在初始化RAG服务...\n');
        await ragService.initialize();

        // 显示统计
        const stats = ragService.getStats();
        console.log('✓ RAG服务统计：');
        console.log(`  - 文档块总数：${stats.totalChunks}`);
        console.log(`  - 已建立索引：${stats.indexed}`);
        console.log(`  - 向量缓存数：${stats.cacheStats.size}`);

        // 测试问题
        const testQuestions = [
            '重修需要什么条件？',
            '如何申请奖学金？',
            '转专业的流程是什么？'
        ];

        console.log('\n' + '='.repeat(60));
        console.log('✓ 开始测试问答...\n');

        for (const question of testQuestions) {
            console.log('\n' + '-'.repeat(60));
            console.log(`【问题】${question}`);
            console.log('-'.repeat(60));

            const result = await ragService.answer(question, {
                topK: 3,
                minScore: 0.3,
                useReranking: true
            });

            console.log('\n【回答】');
            console.log(result.answer);
            console.log('\n【来源】');
            result.sources.forEach((source, index) => {
                console.log(`  ${index + 1}. 页码:${source.page || source.page_num} | 相似度:${source.score?.toFixed(3) || 'N/A'}`);
            });
            console.log(`\n【统计】置信度:${result.confidence.toFixed(3)} | 耗时:${result.elapsed}ms`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✓ 测试完成！');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n✗ 测试失败：', error.message);
        process.exit(1);
    }
}

// 运行测试
testRAG().catch(error => {
    console.error('✗ 程序异常：', error);
    process.exit(1);
});
