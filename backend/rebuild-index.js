/**
 * 重新建立RAG索引（完整版）
 * 步骤：重新处理文档 → 生成文档块 → 建立向量索引
 */

const DocumentProcessor = require('./services/documentProcessor');
const RAGService = require('./services/ragService');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });

async function rebuildIndex() {
  console.log('✓ 开始完整重建RAG索引...\n');

  // 第1步：重新处理文档，生成清理后的文档块
  console.log('========== 第1步：重新处理文档 ==========\n');
  const processor = new DocumentProcessor();

  await processor.loadHandbook();
  processor.chunkDocument();
  processor.mergeSmallChunks();
  processor.addContextWindow();
  await processor.saveChunks();

  const procStats = processor.getStats();
  console.log(`\n✓ 文档处理完成：${procStats.totalChunks}个文档块`);

  // 验证清理效果：对比重修费用相关块
  console.log('\n========== 验证文本清理效果 ==========\n');
  const retakeChunks = processor.chunks.filter(c =>
    c.text.includes('重修') && c.text.includes('费')
  );
  retakeChunks.slice(0, 3).forEach((chunk, i) => {
    console.log(`--- 重修费用相关块 ${i + 1}（第${chunk.page_num}页）---`);
    console.log(chunk.text.substring(0, 200));
    console.log('');
  });

  // 第2步：删除旧索引，强制重建
  console.log('========== 第2步：重建向量索引 ==========\n');
  const indexPath = path.join(__dirname, '../retrieval_index.json');
  if (fs.existsSync(indexPath)) {
    fs.unlinkSync(indexPath);
    console.log('✓ 已删除旧索引文件');
  }

  const ragService = new RAGService(process.env.ZHIPU_API_KEY);
  await ragService.initialize();

  const stats = ragService.getStats();
  console.log('\n✓ 索引重建完成！');
  console.log(`  - 文档块总数：${stats.totalChunks}`);
  console.log(`  - 已建立索引：${stats.indexed}`);

  // 第3步：测试问答
  console.log('\n========== 第3步：测试问答 ==========\n');

  const testQuestion = '重修要交钱吗？';
  const result = await ragService.answer(testQuestion, {
    topK: 5,
    minScore: 0.2
  });

  console.log(`问题：${testQuestion}`);
  console.log('\n回答：');
  console.log(result.answer);
  console.log('\n来源：');
  result.sources.forEach((source, index) => {
    console.log(`  ${index + 1}. ${source.chapter}（第${source.page}页）`);
  });
  console.log(`\n置信度：${(result.confidence * 100).toFixed(0)}%`);
  console.log(`耗时：${result.elapsed}ms`);

  // 保存状态
  await ragService.saveState();
}

rebuildIndex().then(() => {
  console.log('\n✓ 全部完成');
  process.exit(0);
}).catch(error => {
  console.error('\n✗ 失败：', error);
  process.exit(1);
});
