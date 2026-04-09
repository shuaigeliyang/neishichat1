/**
 * 向量索引生成工具
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：基于高质量文档块生成向量索引
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();  // 加载环境变量 (￣▽￣)ﾉ

// 导入EmbeddingService
const EmbeddingService = require('./services/embeddingService');

async function main() {
    console.log('='.repeat(60));
    console.log('向量索引生成工具');
    console.log('设计师：内师智能体系统 (￣▽￣)ﾉ');
    console.log('='.repeat(60));

    // 配置路径
    const sourcePath = path.join(__dirname, '../document_chunks_new.json');
    const outputPath = path.join(__dirname, '../retrieval_index_new.json');
    const cachePath = path.join(__dirname, '../embedding_cache_new.json');

    // 读取文档块
    console.log('\n✓ 正在读取文档块文件...');
    const chunkData = JSON.parse(await fs.readFile(sourcePath, 'utf-8'));

    const metadata = chunkData.metadata;
    const chunks = chunkData.chunks;

    console.log(`  - 总文档块：${metadata.total_chunks}`);
    console.log(`  - 总页数：${metadata.total_pages}`);
    console.log(`  - 平均大小：${metadata.chunk_config.chunk_size} 字符`);

    // 初始化Embedding服务
    console.log('\n✓ 正在初始化向量化服务...');
    const apiKey = process.env.ZHIPU_API_KEY || 'your-api-key-here';

    if (apiKey === 'your-api-key-here') {
        console.error('\n✗ 错误：请设置 ZHIPU_API_KEY 环境变量！');
        console.log('  提示：export ZHIPU_API_KEY=your-actual-key');
        process.exit(1);
    }

    const embeddingService = new EmbeddingService(apiKey, cachePath);

    // 显示缓存统计
    const stats = embeddingService.getCacheStats();
    console.log(`  - 缓存大小：${stats.size} 条记录`);
    console.log(`  - 内存使用：${stats.memoryUsage.toFixed(2)} MB`);

    // 生成向量
    console.log('\n✓ 开始生成向量...');
    console.log('  ⏱️  这可能需要一段时间，请耐心等待...');

    const startTime = Date.now();

    try {
        const chunksWithEmbeddings = await embeddingService.embedChunks(chunks);

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`\n✓ 向量化完成！耗时：${duration} 秒`);

        // 保存向量索引
        console.log(`\n✓ 正在保存向量索引...`);

        const indexData = {
            metadata: {
                ...metadata,
                generated_at: new Date().toISOString(),
                generation_time: `${duration}s`,
                embedding_model: 'embedding-3',
                vector_dimension: chunksWithEmbeddings[0]?.embedding?.length || 0
            },
            chunks: chunksWithEmbeddings,
            // 兼容旧格式的字段
            indexed: true,
            timestamp: new Date().toISOString()
        };

        await fs.writeFile(outputPath, JSON.stringify(indexData, null, 2));

        const fileSize = (await fs.stat(outputPath)).size / 1024 / 1024;
        console.log(`  - 文件大小：${fileSize.toFixed(2)} MB`);
        console.log(`  - 保存路径：${outputPath}`);

        // 显示最终统计
        console.log('\n' + '='.repeat(60));
        console.log('✓ 生成完成！');
        console.log('='.repeat(60));
        console.log(`  - 总文档块：${chunksWithEmbeddings.length}`);
        console.log(`  - 向量维度：${indexData.metadata.vector_dimension}`);
        console.log(`  - 文件大小：${fileSize.toFixed(2)} MB`);
        console.log(`  - 用时：${duration} 秒`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n✗ 生成失败：', error.message);

        if (error.response?.status === 429) {
            console.log('\n💡 建议：');
            console.log('  - API调用达到限流，请稍后重试');
            console.log('  - 或者调整 batch_size 参数');
        }

        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('✗ 程序异常退出：', error);
        process.exit(1);
    });
}

module.exports = { main };
