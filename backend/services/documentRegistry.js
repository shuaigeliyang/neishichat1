/**
 * 文档注册表管理服务
 * 设计师：哈雷酱 (￣▽￣)／
 * 功能：管理多个政策文档的注册信息
 *
 * 核心职责：
 * - 维护文档注册表（registry.json）
 * - 文档的增删改查
 * - 文档状态管理
 * - 生成唯一documentId
 */

const fs = require('fs').promises;
const path = require('path');

class DocumentRegistry {
    constructor() {
        const basePath = path.resolve(__dirname, '../..');
        this.registryPath = path.join(basePath, '文档库', 'registry.json');
        this.registry = null;
    }

    /**
     * 初始化注册表
     */
    async initialize() {
        try {
            await this.loadRegistry();

            // 如果不存在或版本不对，创建新的
            if (!this.registry || this.registry.version !== '2.0') {
                await this.createRegistry();
            }

            return this.registry;
        } catch (error) {
            console.log('✓ 创建新的文档注册表');
            await this.createRegistry();
            return this.registry;
        }
    }

    /**
     * 加载注册表
     */
    async loadRegistry() {
        try {
            const data = await fs.readFile(this.registryPath, 'utf-8');
            this.registry = JSON.parse(data);
            console.log('✓ 加载文档注册表成功');
            return this.registry;
        } catch (error) {
            console.log('⚠️ 注册表不存在，将创建新的');
            return null;
        }
    }

    /**
     * 创建新的注册表
     */
    async createRegistry() {
        this.registry = {
            version: '2.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            config: {
                indexName: 'unified_policy_index',
                embeddingModel: 'embedding-3',
                rerankModel: 'rerank'
            },
            documents: []
        };

        await this.saveRegistry();
        console.log('✓ 文档注册表创建成功');
        return this.registry;
    }

    /**
     * 保存注册表
     */
    async saveRegistry() {
        this.registry.updatedAt = new Date().toISOString();
        await fs.writeFile(this.registryPath, JSON.stringify(this.registry, null, 2), 'utf-8');
    }

    /**
     * 生成唯一的documentId
     */
    generateDocumentId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        return `policy_${timestamp}_${random}`;
    }

    /**
     * 注册新文档
     */
    async registerDocument(docInfo) {
        const documentId = docInfo.documentId || this.generateDocumentId();

        const newDoc = {
            documentId: documentId,
            name: docInfo.name,
            displayName: docInfo.displayName || docInfo.name,
            description: docInfo.description || '',
            status: 'pending',
            tags: docInfo.tags || [],
            sourceFiles: [{
                fileName: docInfo.fileName,
                fileType: docInfo.fileType || '.docx',
                fileSize: docInfo.fileSize || 0,
                uploadedAt: new Date().toISOString()
            }],
            statistics: {
                totalPages: 0,
                totalChunks: 0,
                indexedChunks: 0,
                fileSize: docInfo.fileSize || 0
            },
            indexedAt: null,
            updatedAt: new Date().toISOString()
        };

        this.registry.documents.push(newDoc);
        await this.saveRegistry();

        console.log(`✓ 文档已注册: ${newDoc.name} (${documentId})`);
        return newDoc;
    }

    /**
     * 获取所有文档
     */
    getAllDocuments() {
        return this.registry.documents;
    }

    /**
     * 根据ID获取文档
     */
    getDocumentById(documentId) {
        return this.registry.documents.find(doc => doc.documentId === documentId);
    }

    /**
     * 更新文档状态
     */
    async updateDocumentStatus(documentId, status, statistics = {}) {
        const doc = this.getDocumentById(documentId);
        if (!doc) {
            throw new Error(`文档不存在: ${documentId}`);
        }

        doc.status = status;
        doc.updatedAt = new Date().toISOString();

        if (status === 'indexed') {
            doc.indexedAt = new Date().toISOString();
        }

        // 更新统计信息
        if (statistics.totalPages !== undefined) {
            doc.statistics.totalPages = statistics.totalPages;
        }
        if (statistics.totalChunks !== undefined) {
            doc.statistics.totalChunks = statistics.totalChunks;
        }
        if (statistics.indexedChunks !== undefined) {
            doc.statistics.indexedChunks = statistics.indexedChunks;
        }

        await this.saveRegistry();
        console.log(`✓ 文档状态已更新: ${documentId} -> ${status}`);
        return doc;
    }

    /**
     * 替换文档
     */
    async replaceDocument(documentId, newFileInfo) {
        const doc = this.getDocumentById(documentId);
        if (!doc) {
            throw new Error(`文档不存在: ${documentId}`);
        }

        // 添加新的源文件记录
        doc.sourceFiles.push({
            fileName: newFileInfo.fileName,
            fileType: newFileInfo.fileType,
            fileSize: newFileInfo.fileSize,
            uploadedAt: new Date().toISOString()
        });

        // 重置状态为pending
        doc.status = 'pending';
        doc.statistics.fileSize = newFileInfo.fileSize;
        doc.updatedAt = new Date().toISOString();

        await this.saveRegistry();
        console.log(`✓ 文档已准备替换: ${documentId}`);
        return doc;
    }

    /**
     * 删除文档
     */
    async deleteDocument(documentId) {
        const index = this.registry.documents.findIndex(doc => doc.documentId === documentId);
        if (index === -1) {
            throw new Error(`文档不存在: ${documentId}`);
        }

        const deleted = this.registry.documents.splice(index, 1)[0];
        await this.saveRegistry();

        console.log(`✓ 文档已从注册表删除: ${deleted.name}`);
        return deleted;
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const docs = this.registry.documents;

        return {
            totalDocuments: docs.length,
            indexedDocuments: docs.filter(d => d.status === 'indexed').length,
            pendingDocuments: docs.filter(d => d.status === 'pending').length,
            errorDocuments: docs.filter(d => d.status === 'error').length,
            totalChunks: docs.reduce((sum, d) => sum + (d.statistics.totalChunks || 0), 0),
            indexedChunks: docs.reduce((sum, d) => sum + (d.statistics.indexedChunks || 0), 0)
        };
    }
}

module.exports = DocumentRegistry;
