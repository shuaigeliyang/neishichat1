/**
 * 项目配置管理器
 * 从主项目读取配置并集成到后台管理系统
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectConfigManager {
    constructor() {
        // 主项目路径
        this.mainProjectPath = path.resolve(__dirname, '../../../');
        // 后台管理系统路径
        this.adminProjectPath = path.resolve(__dirname, '../..');

        // 配置文件路径
        this.mainEnvPath = path.join(this.mainProjectPath, 'backend', '.env');
        this.adminEnvPath = path.join(this.adminProjectPath, 'backend', '.env');
    }

    /**
     * 读取主项目的API密钥
     */
    readMainProjectApiKey() {
        try {
            const envContent = fs.readFileSync(this.mainEnvPath, 'utf-8');
            const lines = envContent.split('\n');

            const config = {};
            for (const line of lines) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    config[key] = value;
                }
            }

            return {
                // Anthropic/Minimax配置（当前使用）
                anthropicApiKey: config.ANTHROPIC_API_KEY || null,
                anthropicBaseUrl: config.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
                anthropicModel: config.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
                // Embedding配置
                embeddingMode: config.EMBEDDING_MODE || 'local',  // 使用本地embedding
                // 保留旧配置以兼容（但不再使用）
                zhipuApiKey: config.ZHIPU_API_KEY || null,
                zhipuApiBase: config.ZHIPU_API_BASE || null,
                rerankModel: config.RERANK_MODEL || 'rerank'
            };
        } catch (error) {
            console.error('读取主项目配置失败:', error.message);
            return null;
        }
    }

    /**
     * 获取可用的API密钥（优先使用主项目的）
     */
    getAvailableApiKey() {
        // 优先使用主项目的密钥
        const mainConfig = this.readMainProjectApiKey();

        if (mainConfig && mainConfig.zhipuApiKey) {
            console.log('✓ 使用主项目的API密钥');
            return {
                provider: 'ZHIPU',
                apiKey: mainConfig.zhipuApiKey,
                source: 'main_project',
                config: mainConfig
            };
        }

        // 其次使用后台管理系统的密钥
        try {
            const adminEnvPath = path.join(this.adminProjectPath, '.env');
            const envContent = fs.readFileSync(adminEnvPath, 'utf-8');

            const lines = envContent.split('\n');
            for (const line of lines) {
                if (line.includes('ZHIPUAI_API_KEY')) {
                    const [, ...valueParts] = line.split('=');
                    const apiKey = valueParts.join('=').trim();

                    if (apiKey && apiKey !== 'your_zhipuai_api_key_here') {
                        console.log('✓ 使用后台管理系统的API密钥');
                        return {
                            provider: 'ZHIPU',
                            apiKey: apiKey,
                            source: 'admin_project'
                        };
                    }
                }
            }
        } catch (error) {
            console.error('读取后台管理系统配置失败:', error.message);
        }

        return null;
    }

    /**
     * 验证API密钥是否可用
     */
    async validateApiKey(apiKey) {
        try {
            const response = await axios.post(
                'https://open.bigmodel.cn/api/paas/v4/embeddings',
                {
                    model: 'embedding-3',
                    input: '测试'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return {
                valid: true,
                model: 'embedding-3',
                dimension: 2048
            };
        } catch (error) {
            return {
                valid: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    /**
     * 获取RAG服务配置
     */
    getRAGServiceConfig() {
        const mainConfig = this.readMainProjectApiKey();

        return {
            apiKey: mainConfig?.zhipuApiKey || null,
            apiBase: mainConfig?.zhipuApiBase || 'https://open.bigmodel.cn/api/paas/v4',
            embeddingModel: 'embedding-3',
            chatModel: mainConfig?.rerankModel || 'glm-4-flash',
            embeddingMode: mainConfig?.embeddingModel || 'api',
            rerankModel: mainConfig?.rerankModel || 'rerank'
        };
    }
}

export default ProjectConfigManager;
