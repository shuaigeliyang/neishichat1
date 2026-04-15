/**
 * 项目配置管理 - 单一数据源
 *
 * 所有服务必须从这里读取配置，而不是硬编码路径
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectConfig {
    constructor() {
        this.config = null;
        this.configPath = path.resolve(__dirname, '../../../../文档库/config.json');
    }

    /**
     * 获取配置（带缓存）
     */
    async getConfig() {
        if (this.config) {
            return this.config;
        }

        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(data);
            return this.config;
        } catch (error) {
            console.error('读取配置文件失败:', error.message);
            // 返回默认配置
            return this.getDefaultConfig();
        }
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            name: '教育系统智能体知识库',
            version: '2.0.0',
            paths: {
                root: path.resolve(__dirname, '../../../../'),
                documentLibrary: path.resolve(__dirname, '../../../../文档库'),
                indexDir: path.resolve(__dirname, '../../../../文档库/indexes'),
                // ✨ 修复：使用统一的索引文件，与前台系统同步
                retrievalIndex: path.resolve(__dirname, '../../../../文档库/indexes/unified_index.json'),
                // 同时保存到 retrieval_index.json 作为备份
                retrievalIndexBackup: path.resolve(__dirname, '../../../../文档库/indexes/retrieval_index.json'),
                embeddingCache: path.resolve(__dirname, '../../../../文档库/indexes/embedding_cache.json'),
                registry: path.resolve(__dirname, '../../../../文档库/registry.json'),
                documents: path.resolve(__dirname, '../../../../文档库/documents')
            },
            embedding: {
                provider: 'LOCAL_PYTHON',
                model: 'paraphrase-multilingual-MiniLM-L12-v2',
                dimension: 384
            }
        };
    }

    /**
     * 获取索引路径
     */
    async getIndexPath() {
        const config = await this.getConfig();
        return config.paths.retrievalIndex;
    }

    /**
     * 获取缓存路径
     */
    async getCachePath() {
        const config = await this.getConfig();
        return config.paths.embeddingCache;
    }

    /**
     * 获取注册表路径
     */
    async getRegistryPath() {
        const config = await this.getConfig();
        return config.paths.registry;
    }

    /**
     * 获取文档库路径
     */
    async getDocumentLibraryPath() {
        const config = await this.getConfig();
        return config.paths.documentLibrary;
    }

    /**
     * 获取文档目录路径
     */
    async getDocumentsPath() {
        const config = await this.getConfig();
        return config.paths.documents;
    }

    /**
     * 获取嵌入配置
     */
    async getEmbeddingConfig() {
        const config = await this.getConfig();
        return config.embedding;
    }

    /**
     * 获取检索配置
     */
    async getRetrievalConfig() {
        const config = await this.getConfig();
        return config.retrieval;
    }

    /**
     * 确保目录存在
     */
    async ensureDirectories() {
        const config = await this.getConfig();

        const dirs = [
            config.paths.indexDir,
            config.paths.documents
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`创建目录失败: ${dir}`, error);
            }
        }
    }

    /**
     * 重新加载配置（用于配置变更后）
     */
    async reload() {
        this.config = null;
        return await this.getConfig();
    }

    /**
     * 获取绝对路径（相对于项目根目录）
     */
    async getAbsolutePath(relativePath) {
        const config = await this.getConfig();
        return path.resolve(config.paths.root, relativePath);
    }
}

// 导出单例
export default new ProjectConfig();
