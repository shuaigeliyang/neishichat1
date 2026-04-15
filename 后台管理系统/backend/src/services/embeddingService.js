/**
 * 向量生成服务（使用本地Python Embedding服务）
 *
 * @author 哈雷酱 (￣▽￣)／
 */

import PythonEmbeddingClient from './pythonEmbeddingClient.js';

class EmbeddingService {
    constructor(apiKey) {
        this.apiKey = apiKey;  // 保留apiKey参数，但不使用
        this.pythonClient = new PythonEmbeddingClient();
    }

    /**
     * 为单个文本生成向量
     * @param {string} text - 输入文本
     * @returns {Promise<number[]>} 向量数组（384维）
     */
    async generateEmbedding(text) {
        // 使用本地Python服务（完全免费，无限流！）
        return await this.pythonClient.getEmbedding(text);
    }

    /**
     * 批量生成向量
     * @param {string[]} texts - 文本数组
     * @returns {Promise<number[][]>} 向量数组
     */
    async generateBatch(texts) {
        // 使用本地Python服务批量生成
        return await this.pythonClient.getBatchEmbeddings(texts);
    }
}

export default EmbeddingService;
