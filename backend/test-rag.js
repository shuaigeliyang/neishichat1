/**
 * 多文档RAG服务测试脚本
 * 用法: node test-rag.js
 */

const MultiDocumentRAGService = require('./services/multiDocumentRagService');

async function test() {
    console.log('\n========================================');
    console.log('  多文档RAG服务测试');
    console.log('========================================\n');

    // 创建服务实例
    const ragService = new MultiDocumentRAGService(process.env.ZHIPU_API_KEY);

    console.log('1. 初始化服务...');
    try {
        await ragService.initialize();
        console.log('✅ 初始化成功\n');
    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        process.exit(1);
    }

    console.log('2. 检查索引状态...');
    const stats = ragService.getStatistics();
    console.log('   统计信息:', JSON.stringify(stats, null, 2));

    if (!stats || stats.totalChunks === 0) {
        console.error('\n❌ 索引为空或未加载！');
        process.exit(1);
    }

    console.log('\n3. 测试问答...');
    const testQuestion = '我挂科了怎么办';

    try {
        const result = await ragService.ask(testQuestion, {
            topK: 5,
            minScore: 0.3
        });

        console.log('\n========================================');
        console.log('  测试结果');
        console.log('========================================');
        console.log('\n问题:', testQuestion);
        console.log('\n回答:\n', result.answer);
        console.log('\n来源文档数:', result.sources?.length || 0);
        console.log('检索到chunks:', result.retrievedChunks);

        if (result.sources && result.sources.length > 0) {
            console.log('\n来源详情:');
            result.sources.forEach((source, i) => {
                console.log('  ' + (i + 1) + '. ' + source.documentName + ' (' + (source.chunks?.length || 0) + ' chunks)');
            });
        }

        console.log('\n✅ 测试完成！');
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

test();
