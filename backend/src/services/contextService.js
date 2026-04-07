/**
 * 上下文管理服务
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：管理对话上下文，支持连续对话
 */

const { query } = require('../config/database');

class ContextService {
  constructor() {
    // 内存中的上下文缓存
    this.contextCache = new Map();

    // 定期清理过期上下文
    this.startCleanupTask();
  }

  /**
   * 获取会话上下文
   * @param {string} sessionId - 会话ID
   * @param {number} maxTurns - 最大轮数
   * @returns {Promise<Array>} 消息历史
   */
  async getContext(sessionId, maxTurns = 5) {
    try {
      console.log('📋 获取上下文', { sessionId, maxTurns });

      // 1. 先从缓存获取
      const cached = this.contextCache.get(sessionId);
      if (cached && cached.messages.length > 0) {
        console.log('✅ 从缓存获取上下文', { messagesCount: cached.messages.length });
        return cached.messages.slice(-maxTurns * 2); // 每轮2条消息（user + assistant）
      }

      // 2. 从数据库获取
      const history = await query(`
        SELECT user_question, ai_answer, created_at
        FROM chat_history
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [sessionId, maxTurns]);

      // 3. 构建消息数组（倒序，从早到晚）
      const messages = [];
      for (let i = history.length - 1; i >= 0; i--) {
        messages.push({
          role: 'user',
          content: history[i].user_question
        });
        messages.push({
          role: 'assistant',
          content: this.extractTextFromAnswer(history[i].ai_answer)
        });
      }

      // 4. 缓存到内存
      this.contextCache.set(sessionId, {
        messages,
        createdAt: Date.now()
      });

      console.log('✅ 从数据库获取上下文', { sessionId, messagesCount: messages.length });
      return messages;

    } catch (error) {
      console.error('❌ 获取上下文失败', { error: error.message, sessionId });
      return [];
    }
  }

  /**
   * 更新上下文缓存
   * @param {string} sessionId - 会话ID
   * @param {string} userQuestion - 用户问题
   * @param {string} aiAnswer - AI回答
   */
  updateContext(sessionId, userQuestion, aiAnswer) {
    try {
      const cached = this.contextCache.get(sessionId) || { messages: [] };

      cached.messages.push({
        role: 'user',
        content: userQuestion
      });

      cached.messages.push({
        role: 'assistant',
        content: this.extractTextFromAnswer(aiAnswer)
      });

      // 限制最大消息数（避免内存占用过大）
      if (cached.messages.length > 20) {
        cached.messages = cached.messages.slice(-20);
      }

      this.contextCache.set(sessionId, cached);
      console.log('✅ 更新上下文缓存', { sessionId, messagesCount: cached.messages.length });

    } catch (error) {
      console.error('❌ 更新上下文失败', { error: error.message });
    }
  }

  /**
   * 清除会话上下文
   * @param {string} sessionId - 会话ID
   */
  clearContext(sessionId) {
    this.contextCache.delete(sessionId);
    console.log('🗑️ 清除上下文', { sessionId });
  }

  /**
   * 从AI回答中提取纯文本（去除JSON等格式）
   * @param {string} answer - AI回答
   * @returns {string} 纯文本
   */
  extractTextFromAnswer(answer) {
    try {
      // 尝试解析JSON
      if (answer && answer.trim && answer.trim().startsWith('{')) {
        const parsed = JSON.parse(answer);
        if (parsed.type === 'query' || parsed.type === 'profile' || parsed.type === 'grades') {
          // 对于查询结果，返回简短描述
          return parsed.message || parsed.data?.message || '查询完成';
        }
      }
      // 不是JSON，返回原文（截取前500字符）
      if (answer && answer.length) {
        return answer.length > 500 ? answer.substring(0, 500) + '...' : answer;
      }
      return answer || '';
    } catch (e) {
      // 解析失败，返回原文（截取前500字符）
      if (answer && answer.length) {
        return answer.length > 500 ? answer.substring(0, 500) + '...' : answer;
      }
      return answer || '';
    }
  }

  /**
   * 定期清理过期上下文
   */
  startCleanupTask() {
    // 每30分钟清理一次
    setInterval(() => {
      const now = Date.now();
      const maxAge = 1800000; // 30分钟

      let cleanedCount = 0;
      for (const [sessionId, context] of this.contextCache.entries()) {
        if (now - context.createdAt > maxAge) {
          this.contextCache.delete(sessionId);
          cleanedCount++;
        }
      }

      console.log('🧹 上下文清理完成', {
        remainingContexts: this.contextCache.size,
        cleanedCount
      });
    }, 1800000); // 30分钟
  }

  /**
   * 获取上下文统计信息
   */
  getStats() {
    return {
      totalContexts: this.contextCache.size,
      contexts: Array.from(this.contextCache.entries()).map(([sessionId, context]) => ({
        sessionId,
        messagesCount: context.messages.length,
        createdAt: context.createdAt
      }))
    };
  }
}

// 导出单例
module.exports = new ContextService();
