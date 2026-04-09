/**
 * 测试数据库RAG服务
 */
const DatabaseRAGService = require('./services/databaseRAGService');
require('dotenv').config({ path: __dirname + '/.env' });

async function test() {
    console.log('='.repeat(60));
    console.log('🚀 数据库RAG服务测试');
    console.log('='.repeat(60));

    const ragService = new DatabaseRAGService(process.env.ZHIPU_API_KEY);

    try {
        // 初始化
        await ragService.initialize();

        // 测试问答
        const questions = [
            '重修需要交钱吗？',
            '如何申请奖学金？',
            '转专业有什么条件？'
        ];

        for (const question of questions) {
            console.log('\n' + '='.repeat(60));
            console.log(`❓ ${question}`);
            console.log('='.repeat(60));

            const result = await ragService.answer(question);

            console.log('\n📝 回答：');
            console.log(result.answer);

            console.log('\n📚 来源：');
            result.sources.forEach((s, i) => {
                console.log(`  ${i + 1}. 第${s.page || 0}页`);
            });
            console.log(`\n置信度：${(result.confidence * 100).toFixed(0)}%`);
            console.log(`耗时：${result.elapsed}ms`);
        }

        await ragService.close();
        console.log('\n' + '='.repeat(60));
        console.log('✅ 测试完成！');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\n❌ 测试失败：', error);
        await ragService.close();
        process.exit(1);
    }
}

test();
