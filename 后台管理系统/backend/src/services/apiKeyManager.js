/**
 * API密钥管理服务
 * 支持多种大模型的API密钥配置和管理
 */
import crypto from 'crypto';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ApiKeyManager {
    constructor() {
        // 支持的模型配置
        this.supportedModels = {
            ZHIPU: {
                name: '智谱AI',
                embeddingModel: 'embedding-3',
                chatModel: 'glm-4-flash',
                vectorDimension: 2048,
                validateUrl: 'https://open.bigmodel.cn/api/paas/v4/embeddings'
            },
            OPENAI: {
                name: 'OpenAI',
                embeddingModel: 'text-embedding-3-small',
                chatModel: 'gpt-3.5-turbo',
                vectorDimension: 1536,
                validateUrl: 'https://api.openai.com/v1/embeddings'
            },
            QWEN: {
                name: '阿里通义',
                embeddingModel: 'text-embedding-v3',
                chatModel: 'qwen-plus',
                vectorDimension: 1024,
                validateUrl: 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding'
            },
            ERNIE: {
                name: '百度文心',
                embeddingModel: 'embedding-v1',
                chatModel: 'ernie-bot',
                vectorDimension: 384,
                validateUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/embeddings/embedding-v1'
            },
            ANTHROPIC: {
                name: 'Anthropic/Minimax',
                embeddingModel: '本地Python服务',
                chatModel: 'claude-sonnet-4-20250514',
                vectorDimension: 384,
                validateUrl: 'https://api.minimaxi.com/anthropic/v1/messages'
            }
        };

        // 加密密钥（从环境变量读取，生产环境应该使用专门的密钥管理服务）
        this.encryptionKey = process.env.API_KEY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    }

    /**
     * 加密API密钥
     */
    encryptApiKey(apiKey) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(this.encryptionKey, 'hex');
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
            encrypted,
            iv: iv.toString('hex')
        };
    }

    /**
     * 解密API密钥
     */
    decryptApiKey(encrypted, iv) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(this.encryptionKey, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * 验证API密钥
     */
    async validateApiKey(provider, apiKey) {
        const modelConfig = this.supportedModels[provider];

        if (!modelConfig) {
            return {
                valid: false,
                error: `不支持的模型: ${provider}`
            };
        }

        try {
            // 根据不同的provider使用不同的验证方法

            if (provider === 'ZHIPU') {
                // 智谱AI验证
                const response = await axios.post(
                    modelConfig.validateUrl,
                    {
                        model: modelConfig.embeddingModel,
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
                    provider: provider,
                    model: modelConfig.embeddingModel
                };
            } else if (provider === 'OPENAI') {
                // OpenAI验证
                const response = await axios.post(
                    modelConfig.validateUrl,
                    {
                        model: modelConfig.embeddingModel,
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
                    provider: provider,
                    model: modelConfig.embeddingModel
                };
            } else {
                // 其他模型的验证（简化版）
                return {
                    valid: true,
                    provider: provider,
                    model: modelConfig.embeddingModel,
                    warning: '未完全验证，请谨慎使用'
                };
            }

        } catch (error) {
            return {
                valid: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    /**
     * 获取支持的模型列表
     */
    getSupportedModels() {
        return Object.keys(this.supportedModels).map(key => ({
            provider: key,
            ...this.supportedModels[key]
        }));
    }

    /**
     * 获取模型配置
     */
    getModelConfig(provider) {
        return this.supportedModels[provider];
    }

    /**
     * 生成密钥掩码（用于显示）
     */
    maskApiKey(apiKey) {
        if (!apiKey || apiKey.length < 10) {
            return '***';
        }
        return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
    }
}

export default ApiKeyManager;
