/**
 * 快速索引重建脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：从embedding缓存快速构建检索索引
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('🚀 快速索引重建脚本');
console.log('='.repeat(60));

// 第1步：加载embedding缓存
console.log('\n📦 第1步：加载embedding缓存...');
const cacheData = JSON.parse(fs.readFileSync('./embedding_cache.json', 'utf-8'));
const embeddingCache = new Map(cacheData);
console.log(`✓ 加载了${embeddingCache.size}条embedding缓存`);

// 第2步：加载文档块
console.log('\n📦 第2步：加载文档块...');
const chunks = JSON.parse(fs.readFileSync('./document_chunks.json', 'utf-8'));
console.log(`✓ 加载了${chunks.length}个文档块`);

// 第3步：定义文本哈希函数（与EmbeddingService一致）
function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// 第4步：为每个chunk应用embedding
console.log('\n📦 第3步：应用embedding到文档块...');
let matchedCount = 0;
let unmatchedCount = 0;

for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    // 使用full_context或text来查找embedding
    const textToHash = chunk.full_context || chunk.text;
    const cacheKey = hashText(textToHash);

    if (embeddingCache.has(cacheKey)) {
        chunk.embedding = embeddingCache.get(cacheKey);
        matchedCount++;

        if (matchedCount % 500 === 0) {
            console.log(`  - 已处理 ${matchedCount}/${chunks.length} 个文档块`);
        }
    } else {
        // 尝试使用text字段
        const textCacheKey = hashText(chunk.text);
        if (embeddingCache.has(textCacheKey)) {
            chunk.embedding = embeddingCache.get(textCacheKey);
            matchedCount++;
        } else {
            unmatchedCount++;
        }
    }
}

console.log(`\n✓ Embedding匹配完成！`);
console.log(`  - 成功匹配：${matchedCount}`);
console.log(`  - 未找到embedding：${unmatchedCount}`);

// 第5步：保存检索索引
console.log('\n📦 第4步：保存检索索引...');
const indexData = {
    chunks: chunks,
    indexed: true,
    timestamp: new Date().toISOString()
};

const indexPath = './retrieval_index.json';
fs.writeFileSync(indexPath, JSON.stringify(indexData), 'utf-8');
console.log(`✓ 索引已保存到：${indexPath}`);
console.log(`✓ 文件大小：${(fs.statSync(indexPath).size / 1024 / 1024).toFixed(2)} MB`);

// 统计信息
console.log('\n📊 索引统计：');
console.log(`  - 文档块总数：${chunks.length}`);
console.log(`  - 有embedding：${chunks.filter(c => c.embedding).length}`);
console.log(`  - 索引时间：${indexData.timestamp}`);

console.log('\n' + '='.repeat(60));
console.log('✅ 索引重建完成！');
console.log('='.repeat(60));
