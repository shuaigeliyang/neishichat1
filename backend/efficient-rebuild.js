/**
 * 高效索引重建脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：智能检测已缓存的embedding，只为缺失的部分生成
 */

const path = require('path');
require('dotenv').config();

// 设置HuggingFace镜像（本地embedding不可用时不影响）
process.env.HF_ENDPOINT = 'https://hf-mirror.com';

const RetrievalEngine = require('./services/retrievalEngine');
const fs = require('fs').promises;
const fsSync = require('fs');

console.log('='.repeat(60));
console.log('🚀 高效索引重建脚本');
console.log('='.repeat(60));

// 哈希函数
function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

async function main() {
    // 第1步：加载文档块
    console.log('\n📦 第1步：加载文档块...');
    const chunksPath = './document_chunks.json';
    const chunks = JSON.parse(fsSync.readFileSync(chunksPath, 'utf-8'));
    console.log(`✓ 加载了${chunks.length}个文档块`);

    // 第2步：加载embedding缓存
    console.log('\n📦 第2步：加载embedding缓存...');
    const cachePath = './embedding_cache.json';
    let embeddingCache = new Map();
    try {
        const cacheData = JSON.parse(fsSync.readFileSync(cachePath, 'utf-8'));
        embeddingCache = new Map(cacheData);
        console.log(`✓ 加载了${embeddingCache.size}条embedding缓存`);
    } catch (e) {
        console.log('✓ 缓存为空，将创建新缓存');
    }

    // 第3步：检查哪些chunks已经有embedding
    console.log('\n📦 第3步：分析embedding状态...');
    const chunksWithEmbedding = chunks.filter(c => c.embedding);
    const chunksNeedEmbedding = chunks.filter(c => !c.embedding);
    console.log(`  - 已有embedding：${chunksWithEmbedding.length}`);
    console.log(`  - 需要生成embedding：${chunksNeedEmbedding.length}`);

    if (chunksNeedEmbedding.length === 0) {
        console.log('\n✅ 所有chunks已有embedding，直接保存索引！');
        return saveIndex(chunks);
    }

    // 第4步：创建检索引擎（使用API模式）
    console.log('\n📦 第4步：初始化检索引擎...');
    const engine = new RetrievalEngine(process.env.ZHIPU_API_KEY, {
        embeddingMode: 'api',
        cachePath: cachePath
    });

    // 注入已有的缓存
    engine.embeddingService.cache = embeddingCache;

    // 第5步：为需要embedding的chunks生成embedding
    console.log('\n📦 第5步：生成缺失的embedding...');
    const batchSize = 50;
    let processed = 0;
    let cached = 0;
    let apiCalls = 0;

    for (let i = 0; i < chunksNeedEmbedding.length; i += batchSize) {
        const batch = chunksNeedEmbedding.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(chunksNeedEmbedding.length / batchSize);

        console.log(`\n  处理批次 ${batchNum}/${totalBatches} (${i + batch.length}/${chunksNeedEmbedding.length})`);

        for (const chunk of batch) {
            const textToHash = chunk.full_context || chunk.text;
            const cacheKey = hashText(textToHash);

            if (embeddingCache.has(cacheKey)) {
                // 使用缓存
                chunk.embedding = embeddingCache.get(cacheKey);
                cached++;
            } else {
                // 需要API调用
                try {
                    const embedding = await engine.embeddingService.getEmbedding(textToHash);
                    chunk.embedding = embedding;
                    embeddingCache.set(cacheKey, embedding);
                    apiCalls++;

                    // 每10次API调用保存一次缓存
                    if (apiCalls % 10 === 0) {
                        await saveCache(embeddingCache, cachePath);
                        console.log('    ✓ 已保存缓存（防止中断）');
                    }
                } catch (error) {
                    console.error(`    ✗ 生成embedding失败：${error.message}`);
                }
            }
            processed++;
        }

        // 每批次结束显示进度
        console.log(`  ✓ 本批次完成 (缓存:${cached}, API:${apiCalls})`);
    }

    // 第6步：保存缓存
    console.log('\n📦 第6步：保存embedding缓存...');
    await saveCache(embeddingCache, cachePath);

    // 第7步：保存索引
    console.log('\n📦 第7步：保存检索索引...');
    await saveIndex(chunks);

    console.log('\n📊 统计信息：');
    console.log(`  - 总chunks：${chunks.length}`);
    console.log(`  - 使用缓存：${cached}`);
    console.log(`  - API调用：${apiCalls}`);
    console.log(`  - 缓存大小：${embeddingCache.size}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 索引重建完成！');
    console.log('='.repeat(60));
}

async function saveCache(cache, path) {
    const data = Array.from(cache.entries());
    fsSync.writeFileSync(path, JSON.stringify(data), 'utf-8');
}

async function saveIndex(chunks) {
    const indexData = {
        chunks: chunks,
        indexed: true,
        timestamp: new Date().toISOString()
    };

    const indexPath = './retrieval_index.json';
    fsSync.writeFileSync(indexPath, JSON.stringify(indexData), 'utf-8');
    console.log(`✓ 索引已保存到：${indexPath}`);
    console.log(`✓ 文件大小：${(fsSync.statSync(indexPath).size / 1024 / 1024).toFixed(2)} MB`);
}

main().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('\n✗ 失败：', error);
    process.exit(1);
});
