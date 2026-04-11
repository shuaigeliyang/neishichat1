/**
 * 数据迁移脚本
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：将现有的学生手册数据迁移到新的多文档管理结构
 *
 * 迁移内容：
 * 1. 在registry.json中注册学生手册
 * 2. 创建unified_index.json并迁移现有chunks
 * 3. 更新chunks结构添加documentId和documentName
 */

const fs = require('fs').promises;
const path = require('path');
const DocumentRegistry = require('../services/documentRegistry');
const UnifiedIndexManager = require('../services/unifiedIndexManager');

class DataMigrator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.registry = new DocumentRegistry();
        this.indexManager = new UnifiedIndexManager(apiKey, {
            embeddingMode: process.env.EMBEDDING_MODE || 'api'
        });
    }

    /**
     * 执行迁移
     */
    async migrate() {
        console.log('\n========== 开始数据迁移 ==========\n');

        try {
            // 1. 初始化服务
            await this.registry.initialize();
            await this.indexManager.initialize();

            // 2. 读取现有的学生手册数据
            const handbookData = await this.loadHandbookData();
            const indexData = await this.loadIndexData();

            // 3. 在registry中注册学生手册
            const docInfo = await this.registerHandbook(handbookData);

            // 4. 迁移chunks到unified_index
            await this.migrateChunks(docInfo.documentId, indexData);

            // 5. 更新文档状态为已索引
            await this.registry.updateDocumentStatus(docInfo.documentId, 'indexed', {
                totalPages: handbookData.total_pages || handbookData.pages?.length || 0,
                totalChunks: indexData.chunks?.length || 0,
                indexedChunks: indexData.chunks?.length || 0
            });

            console.log('\n========== 数据迁移完成 ==========\n');
            console.log('✓ 文档注册表: 文档库/registry.json');
            console.log('✓ 统一索引: 文档库/indexes/unified_index.json');
            console.log('\n可以开始使用新的多文档管理系统了！');

        } catch (error) {
            console.error('\n✗ 迁移失败:', error.message);
            throw error;
        }
    }

    /**
     * 加载学生手册数据
     */
    async loadHandbookData() {
        const basePath = path.resolve(__dirname, '../..');
        const handbookPath = path.join(basePath, '文档提取', '2025年本科学生手册-定', 'student_handbook_full.json');

        console.log('✓ 读取学生手册数据...');
        const data = await fs.readFile(handbookPath, 'utf-8');
        return JSON.parse(data);
    }

    /**
     * 加载索引数据
     */
    async loadIndexData() {
        const basePath = path.resolve(__dirname, '../..');
        const indexPath = path.join(basePath, '文档提取', '2025年本科学生手册-定', 'retrieval_index.json');

        console.log('✓ 读取现有索引...');
        const data = await fs.readFile(indexPath, 'utf-8');
        return JSON.parse(data);
    }

    /**
     * 在registry中注册学生手册
     */
    async registerHandbook(handbookData) {
        console.log('\n✓ 注册学生手册到文档注册表...');

        // 检查文档大小
        const basePath = path.resolve(__dirname, '../..');
        const docPath = path.join(basePath, '相关文档', '2025年本科学生手册-定.docx');
        let fileSize = 0;

        try {
            const stats = await fs.stat(docPath);
            fileSize = stats.size;
        } catch (error) {
            console.log('  ⚠️ 无法获取文件大小');
        }

        const docInfo = await this.registry.registerDocument({
            name: '2025年本科学生手册-定',
            displayName: '2025年本科学生手册',
            description: '内江师范学院2025年本科学生手册',
            tags: ['学生手册', '学籍', '纪律'],
            fileName: '2025年本科学生手册-定.docx',
            fileType: '.docx',
            fileSize: fileSize
        });

        console.log(`  ✓ 文档ID: ${docInfo.documentId}`);
        return docInfo;
    }

    /**
     * 迁移chunks到unified_index
     */
    async migrateChunks(documentId, indexData) {
        console.log('\n✓ 迁移chunks到统一索引...');

        const chunks = indexData.chunks || [];
        console.log(`  - 迁移 ${chunks.length} 个 chunks`);

        // 转换chunk格式，添加documentId和documentName
        const convertedChunks = chunks.map((chunk, idx) => ({
            chunkId: idx + 1,
            documentId: documentId,
            documentName: '2025年本科学生手册-定',
            chapter: chunk.chapter_title || chunk.chapter || '',
            page: chunk.page_num || chunk.page || 1,
            text: chunk.text,
            embedding: chunk.embedding || null
        }));

        // 直接写入unified_index.json
        this.indexManager.indexData.chunks = convertedChunks;
        this.indexManager.indexData.documents = [{
            documentId: documentId,
            name: '2025年本科学生手册-定',
            indexedAt: new Date().toISOString()
        }];
        this.indexManager.indexData.metadata.totalDocuments = 1;
        this.indexManager.indexData.metadata.totalChunks = convertedChunks.length;

        await this.indexManager.saveIndex();

        console.log(`  ✓ 已迁移 ${convertedChunks.length} 个 chunks`);
    }
}

// 执行迁移
async function main() {
    const apiKey = process.env.ZHIPU_API_KEY;

    if (!apiKey) {
        console.error('✗ 错误: 请设置 ZHIPU_API_KEY 环境变量');
        process.exit(1);
    }

    const migrator = new DataMigrator(apiKey);
    await migrator.migrate();
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(error => {
        console.error('迁移失败:', error);
        process.exit(1);
    });
}

module.exports = DataMigrator;
