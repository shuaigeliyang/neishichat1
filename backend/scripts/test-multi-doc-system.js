/**
 * 多文档系统快速测试脚本
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：测试新的多政策文档管理系统
 *
 * 测试内容：
 * 1. 文档注册表功能
 * 2. 统一索引功能
 * 3. 多文档RAG问答
 */

require('dotenv').config();
const DocumentRegistry = require('../services/documentRegistry');
const UnifiedIndexManager = require('../services/unifiedIndexManager');
const MultiDocumentRAGService = require('../services/multiDocumentRagService');

async function testRegistry() {
    console.log('\n========== 测试文档注册表 ==========\n');

    const registry = new DocumentRegistry();
    await registry.initialize();

    // 获取统计信息
    const stats = registry.getStatistics();
    console.log('📊 注册表统计：');
    console.log(`  - 总文档数: ${stats.totalDocuments}`);
    console.log(`  - 已索引: ${stats.indexedDocuments}`);
    console.log(`  - 待处理: ${stats.pendingDocuments}`);
    console.log(`  - 错误: ${stats.errorDocuments}`);

    // 列出所有文档
    const docs = registry.getAllDocuments();
    console.log('\n📄 已注册文档：');
    docs.forEach(doc => {
        console.log(`  • ${doc.displayName} (${doc.status})`);
    });

    return registry;
}

async function testUnifiedIndex() {
    console.log('\n========== 测试统一索引 ==========\n');

    const indexManager = new UnifiedIndexManager(process.env.ZHIPU_API_KEY, {
        embeddingMode: process.env.EMBEDDING_MODE || 'api'
    });
    await indexManager.initialize();

    // 获取统计信息
    const stats = indexManager.getStatistics();
    console.log('📊 统一索引统计：');
    console.log(`  - 总文档数: ${stats.totalDocuments}`);
    console.log(`  - 总chunks: ${stats.totalChunks}`);

    // 列出所有已索引文档
    console.log('\n📄 已索引文档：');
    stats.documents.forEach(doc => {
        console.log(`  • ${doc.name}`);
    });

    return indexManager;
}

async function testMultiDocumentRAG() {
    console.log('\n========== 测试多文档RAG问答 ==========\n');

    const ragService = new MultiDocumentRAGService(process.env.ZHIPU_API_KEY, {
        embeddingMode: process.env.EMBEDDING_MODE || 'api'
    });
    await ragService.initialize();

    // 测试问题
    const testQuestions = [
        '学生手册中关于考试纪律有什么规定？',
        '奖学金评定有哪些条件？',
        '学生可以申请休学吗？'
    ];

    for (const question of testQuestions) {
        console.log(`\n❓ 问题: ${question}`);
        const result = await ragService.ask(question, { topK: 3 });

        console.log('\n💡 回答:');
        console.log(result.answer);

        console.log('\n📚 来源:');
        result.sources.forEach(source => {
            console.log(`  • ${source.documentName}`);
            source.chunks.forEach(chunk => {
                console.log(`    - 第${chunk.page}页 | 相似度: ${chunk.score.toFixed(3)}`);
            });
        });
    }
}

async function main() {
    console.log('\n========================================');
    console.log('  多政策文档管理系统 - 测试脚本');
    console.log('  设计师：哈雷酱 (￣▽￣)／');
    console.log('========================================\n');

    try {
        // 1. 测试文档注册表
        await testRegistry();

        // 2. 测试统一索引
        await testUnifiedIndex();

        // 3. 测试多文档RAG问答（可选，需要API调用）
        const runRAGTest = process.argv.includes('--rag');
        if (runRAGTest) {
            await testMultiDocumentRAG();
        } else {
            console.log('\n💡 提示：使用 --rag 参数运行RAG问答测试');
            console.log('   例如：node test-multi-doc-system.js --rag');
        }

        console.log('\n✅ 所有测试完成！\n');

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 运行测试
main();
