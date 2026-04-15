/**
 * 统一RAG问答服务 - 使用统一索引管理器（本地Python Embedding）
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import axios from 'axios';
import unifiedIndexManager from './unifiedIndexManager.js';
import eventBus from './eventBus.js';
import PythonEmbeddingClient from './pythonEmbeddingClient.js';

class UnifiedRAGService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
        this.CHAT_URL = process.env.ANTHROPIC_BASE_URL + '/v1/messages' || 'https://api.minimaxi.com/anthropic/v1/messages';
        this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
        this.initialized = false;

        // 本地Python Embedding客户端（本小姐的终极武器！）
        this.pythonEmbeddingClient = new PythonEmbeddingClient();
    }

    /**
     * 初始化
     */
    async initialize() {
        if (this.initialized) return;

        console.log('✓ 初始化统一RAG服务...');
        await unifiedIndexManager.initialize();

        // 订阅事件 - 当有新文档索引时，RAG自动感知
        const EventTypes = eventBus.constructor.EventTypes;
        eventBus.on(EventTypes.DOCUMENT_INDEXED, (event) => {
            console.log('📢 [RAG] 检测到新文档索引:', event.data.documentId);
        });

        eventBus.on(EventTypes.DOCUMENT_DELETED, (event) => {
            console.log('📢 [RAG] 检测到文档删除:', event.data.documentId);
        });

        this.initialized = true;
        console.log('✓ 统一RAG服务初始化完成');
    }

    /**
     * 问答
     * @param {string} question - 用户问题
     * @param {Object} options - 配置选项
     * @param {number} options.topK - 检索返回的文档数量
     * @param {number} options.minScore - 最小相似度阈值
     * @param {string[]} options.documentIds - 可选：指定要检索的文档ID列表
     */
    async ask(question, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const { topK = 5, minScore = 0.3, documentIds = null } = options;  // ✨ 新增：documentIds参数

        console.log(`\n========== 问题：${question} ==========`);

        // ✨ 新增：文档过滤日志
        if (documentIds && documentIds.length > 0) {
            console.log(`🎯 指定文档检索：${documentIds.join(', ')}`);
        }

        // 1. 生成问题向量
        const questionEmbedding = await this.generateEmbedding(question);

        // 2. 检索相关chunks（✨ 新增：传递documentIds参数）
        const results = await unifiedIndexManager.retrieve(questionEmbedding, {
            topK,
            minScore,
            documentIds  // ✨ 新增：文档过滤参数
        });

        console.log(`检索到 ${results.length} 个相关chunks`);

        if (results.length === 0) {
            return {
                answer: '抱歉，我在已索引的文档中没有找到与您问题相关的内容。',
                sources: []
            };
        }

        // 3. 构建上下文
        const context = results.map((r, i) =>
            `[文档${i + 1}] ${r.chunk.documentName} (相关度: ${(r.score * 100).toFixed(1)}%)\n${r.chunk.text || r.chunk.full_context}`
        ).join('\n\n');

        // 4. 调用LLM生成回答
        const answer = await this.generateAnswer(question, context, results);

        return {
            answer,
            sources: results.map(r => ({
                documentId: r.chunk.documentId,
                documentName: r.chunk.documentName,
                page: r.chunk.page || r.chunk.metadata?.page,
                score: r.score,
                snippet: (r.chunk.text || r.chunk.full_context || '').substring(0, 200)
            }))
        };
    }

    /**
     * 生成Embedding（使用本地Python服务）
     */
    async generateEmbedding(text) {
        // 使用本地Python embedding服务（完全免费，无限流！）
        return await this.pythonEmbeddingClient.getEmbedding(text);
    }

    /**
     * 生成回答
     */
    async generateAnswer(question, context, retrievedChunks) {
        const systemPrompt = `你是教育系统的智能助手，负责根据提供的文档内容回答用户问题。

规则：
1. 只根据提供的文档内容回答，不要编造信息
2. 如果文档内容不足以回答问题，说明"文档中没有相关信息"
3. 回答要清晰、有条理
4. 适当引用文档来源

提供的文档内容：
${context}`;

        try {
            const response = await axios.post(
                this.CHAT_URL,
                {
                    model: this.model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: question }
                    ],
                    temperature: 0.7
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    timeout: 60000
                }
            );

            return response.data.content[0].text;
        } catch (error) {
            console.error('LLM调用失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        return unifiedIndexManager.getStatistics();
    }

    /**
     * 获取已索引的文档列表
     */
    getIndexedDocuments() {
        return unifiedIndexManager.index?.documents || [];
    }
}

export default UnifiedRAGService;
