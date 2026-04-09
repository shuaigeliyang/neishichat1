/**
 * RAG本地模式测试脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

// 设置HuggingFace镜像（国内加速）
process.env.HF_ENDPOINT = 'https://hf-mirror.com';

const RAGService = require('./services/ragService');
require('dotenv').config();

async function testRAG() {
    console.log('='.repeat(60));
    console.log('🚀 RAG本地模式测试');
    console.log('='.repeat(60));

    try {
        // 创建RAG服务（使用本地模式）
        const ragService = new RAGService(process.env.ZHIPU_API_KEY, {
            embeddingMode: 'local',  // 使用本地模式
            cachePath: './local_embedding_cache.json'
        });

        console.log('\n📦 初始化RAG服务...');
        await ragService.initialize();

        console.log('\n' + '='.repeat(60));
        console.log('❓ 测试问题：挂科了怎么办？');
        console.log('='.repeat(60));

        const result = await ragService.answer('挂科了怎么办', {
            topK: 3,
            minScore: 0.3
        });

        console.log('\n📝 回答：');
        console.log(result.answer);

        console.log('\n📚 来源：');
        result.sources.forEach((source, index) => {
            console.log(`  ${index + 1}. [${source.chapter}] 第${source.page}页`);
            console.log(`     ${source.text.substring(0, 100)}...`);
        });

        console.log(`\n✅ 置信度：${(result.confidence * 100).toFixed(0)}%`);
        console.log(`⏱️ 耗时：${result.elapsed}ms`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ 测试完成！RAG本地模式工作正常！');
        console.log('='.repeat(60));

        // 保存状态
        await ragService.saveState();

        process.exit(0);
    } catch (error) {
        console.error('\n❌ 测试失败：', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testRAG();
