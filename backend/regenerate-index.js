/**
 * 重新生成文档索引脚本（使用本地Python embedding）
 * 设计师：哈雷酱 (￣▽￣)ﾉ
 * 功能：将所有chunks的embedding从2048维（智谱API）替换为384维（本地Python）
 */

const fs = require('fs').promises;
const path = require('path');
const PythonEmbeddingClient = require('./pythonEmbeddingClient');

async function regenerateIndex() {
    console.log('========================================');
    console.log('重新生成文档索引');
    console.log('========================================\n');

    const indexPath = path.join(__dirname, '../文档库/indexes/unified_index.json');

    // 1. 读取现有索引
    console.log('[1/4] 读取现有索引...');
    let indexData;
    try {
        const data = await fs.readFile(indexPath, 'utf-8');
        indexData = JSON.parse(data);
        console.log(`  - 文档数: ${indexData.documents.length}`);
        console.log(`  - 总chunks: ${indexData.chunks.length}`);
    } catch (error) {
        console.error('  - 读取失败:', error.message);
        process.exit(1);
    }

    // 2. 初始化Python embedding客户端
    console.log('\n[2/4] 初始化Python Embedding客户端...');
    const embeddingClient = new PythonEmbeddingClient();

    const available = await embeddingClient.checkService();
    if (!available) {
        console.error('  - Python服务不可用！请先启动服务：');
        console.error('    python local_embedding_service.py');
        process.exit(1);
    }

    // 3. 为每个chunk重新生成embedding
    console.log('\n[3/4] 重新生成embedding向量...');
    console.log(`  - 需要处理: ${indexData.chunks.length} 个chunks`);
    console.log('  - 这可能需要10-15分钟，请耐心等待...\n');

    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < indexData.chunks.length; i++) {
        const chunk = indexData.chunks[i];

        try {
            // 使用文本内容生成embedding
            const text = chunk.full_context || chunk.text || chunk.content;
            if (!text) {
                console.log(`  [${i+1}/${indexData.chunks.length}] 跳过（无文本内容）`);
                failCount++;
                continue;
            }

            console.log(`  [${i+1}/${indexData.chunks.length}] 生成embedding: ${(chunk.documentId || 'unknown').substring(0, 30)}...`);

            // 调用Python服务生成embedding
            const embedding = await embeddingClient.getEmbedding(text);

            // 更新chunk的embedding
            chunk.embedding = embedding;
            chunk.embedding_model = 'paraphrase-multilingual-MiniLM-L12-v2';
            chunk.embedding_dimension = embedding.length;

            successCount++;

            // 每10个chunks显示一次进度
            if ((i + 1) % 10 === 0) {
                const elapsed = Date.now() - startTime;
                const avgTime = elapsed / (i + 1);
                const remaining = avgTime * (indexData.chunks.length - i - 1);
                console.log(`    - 进度: ${((i+1)/indexData.chunks.length*100).toFixed(1)}% | 已用时: ${(elapsed/1000).toFixed(0)}s | 预计剩余: ${(remaining/1000).toFixed(0)}s`);
            }

        } catch (error) {
            console.error(`  [${i+1}/${indexData.chunks.length}] 失败: ${error.message}`);
            failCount++;
        }
    }

    const totalTime = Date.now() - startTime;

    console.log('\n  ----------------------------------------');
    console.log(`  成功: ${successCount} 个`);
    console.log(`  失败: ${failCount} 个`);
    console.log(`  总耗时: ${(totalTime/1000).toFixed(1)} 秒`);
    console.log(`  平均每个: ${(totalTime/successCount).toFixed(0)} ms`);

    // 4. 保存更新后的索引
    console.log('\n[4/4] 保存更新后的索引...');
    try {
        // 备份原索引
        const backupPath = indexPath + '.backup.' + Date.now();
        await fs.copyFile(indexPath, backupPath);
        console.log(`  - 备份已保存: ${path.basename(backupPath)}`);

        // 保存新索引
        await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
        console.log(`  - 新索引已保存`);

        // 显示向量维度
        const sampleChunk = indexData.chunks.find(c => c.embedding);
        console.log(`  - 新向量维度: ${sampleChunk ? sampleChunk.embedding.length : 'unknown'}`);

    } catch (error) {
        console.error('  - 保存失败:', error.message);
        process.exit(1);
    }

    console.log('\n========================================');
    console.log('索引重新生成完成！');
    console.log('========================================\n');

    console.log('总结:');
    console.log(`  - 处理chunks: ${indexData.chunks.length} 个`);
    console.log(`  - 成功: ${successCount} 个`);
    console.log(`  - 失败: ${failCount} 个`);
    console.log(`  - 新embedding模型: paraphrase-multilingual-MiniLM-L12-v2`);
    console.log(`  - 新向量维度: 384`);
    console.log(`  - 总耗时: ${(totalTime/1000).toFixed(1)} 秒`);
    console.log('\n现在可以启动后台服务测试RAG功能了！');
}

// 执行
regenerateIndex().catch(error => {
    console.error('\n错误:', error);
    process.exit(1);
});
