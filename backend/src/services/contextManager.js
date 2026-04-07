/**
 * 上下文管理器
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：管理对话上下文，支持多轮对话和上下文推理
 */

const logger = require('../utils/logger');

class ContextManager {
  constructor() {
    // 存储每个会话的上下文
    // Map<sessionId, Array<message>>
    this.contexts = new Map();

    // 上下文配置
    this.config = {
      maxContextLength: 10,     // 最大上下文长度
      maxContextAge: 30 * 60 * 1000,  // 上下文最大有效期（30分钟）
      cleanupInterval: 5 * 60 * 1000  // 清理间隔（5分钟）
    };

    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 添加消息到上下文
   * @param {string} sessionId - 会话ID
   * @param {string} role - 角色（user/assistant）
   * @param {string} content - 消息内容
   * @param {Object} metadata - 元数据（查询结果、SQL等）
   */
  addMessage(sessionId, role, content, metadata = {}) {
    if (!sessionId) {
      logger.warn('sessionId为空，无法添加到上下文');
      return;
    }

    // 确保会话存在
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, []);
    }

    const context = this.contexts.get(sessionId);

    // 添加新消息
    context.push({
      role,
      content,
      metadata,
      timestamp: new Date()
    });

    // 限制上下文长度
    if (context.length > this.config.maxContextLength) {
      context.shift(); // 移除最旧的消息
      logger.debug('上下文超长，移除最旧消息', { sessionId, length: context.length });
    }

    logger.debug('添加消息到上下文', {
      sessionId,
      role,
      contentLength: content.length,
      contextLength: context.length
    });
  }

  /**
   * 获取会话上下文
   * @param {string} sessionId - 会话ID
   * @returns {Array}
   */
  getContext(sessionId) {
    if (!sessionId || !this.contexts.has(sessionId)) {
      return [];
    }

    const context = this.contexts.get(sessionId);

    // 过滤过期的消息
    const now = new Date();
    const validContext = context.filter(msg => {
      const age = now - new Date(msg.timestamp);
      return age < this.config.maxContextAge;
    });

    // 如果有过期消息被过滤，更新上下文
    if (validContext.length < context.length) {
      this.contexts.set(sessionId, validContext);
      logger.debug('过滤过期上下文消息', {
        sessionId,
        before: context.length,
        after: validContext.length
      });
    }

    return validContext;
  }

  /**
   * 清除会话上下文
   * @param {string} sessionId - 会话ID
   */
  clearContext(sessionId) {
    if (this.contexts.has(sessionId)) {
      this.contexts.delete(sessionId);
      logger.info('清除会话上下文', { sessionId });
    }
  }

  /**
   * 提取上下文中的关键信息
   * @param {string} sessionId - 会话ID
   * @returns {Object}
   */
  extractKeyInfo(sessionId) {
    const context = this.getContext(sessionId);

    const keyInfo = {
      lastQuery: null,        // 最后一次查询
      lastResult: null,       // 最后一次查询结果
      lastRowCount: 0,        // 最后一次查询行数
      entities: {},           // 提取的实体（如专业、学院等）
      queries: []             // 所有历史查询
    };

    for (const msg of context) {
      if (msg.metadata) {
        // 提取查询
        if (msg.metadata.query) {
          keyInfo.queries.push(msg.metadata.query);
          keyInfo.lastQuery = msg.metadata.query;
        }

        // 提取结果
        if (msg.metadata.result) {
          keyInfo.lastResult = msg.metadata.result;
          keyInfo.lastRowCount = msg.metadata.rowCount || 0;
        }

        // 提取实体
        if (msg.metadata.entities) {
          Object.assign(keyInfo.entities, msg.metadata.entities);
        }
      }
    }

    return keyInfo;
  }

  /**
   * 构建上下文摘要（用于AI理解）
   * @param {string} sessionId - 会话ID
   * @returns {string}
   */
  buildContextSummary(sessionId) {
    const keyInfo = this.extractKeyInfo(sessionId);
    const context = this.getContext(sessionId);

    if (context.length === 0) {
      return '';
    }

    let summary = '## 对话历史摘要\n\n';

    // 添加查询历史
    if (keyInfo.queries.length > 0) {
      summary += '### 最近执行的查询：\n';
      keyInfo.queries.slice(-3).forEach((query, index) => {
        summary += `${index + 1}. ${query.substring(0, 100)}...\n`;
      });
      summary += '\n';
    }

    // 添加实体信息
    if (Object.keys(keyInfo.entities).length > 0) {
      summary += '### 提取的实体信息：\n';
      for (const [key, value] of Object.entries(keyInfo.entities)) {
        summary += `- ${key}: ${value}\n`;
      }
      summary += '\n';
    }

    // 添加最后查询结果
    if (keyInfo.lastRowCount > 0) {
      summary += `### 上次查询返回 ${keyInfo.lastRowCount} 条记录\n\n`;
    }

    return summary;
  }

  /**
   * 生成上下文增强提示词
   * @param {string} sessionId - 会话ID
   * @param {string} currentQuery - 当前查询
   * @returns {string}
   */
  buildEnhancedPrompt(sessionId, currentQuery) {
    const context = this.getContext(sessionId);

    if (context.length === 0) {
      return currentQuery;
    }

    const contextSummary = this.buildContextSummary(sessionId);
    const lastMessage = context[context.length - 1];

    let enhancedPrompt = '';

    // 添加上下文摘要
    if (contextSummary) {
      enhancedPrompt += `${contextSummary}\n`;
    }

    // 添加当前查询
    enhancedPrompt += `## 当前用户问题：\n${currentQuery}\n`;

    // 添加上下文提示
    if (context.length > 0) {
      enhancedPrompt += `\n## 注意：用户可能在上文提到了某些实体（如"他们"、"这些学生"等），请结合上下文理解\n`;
    }

    return enhancedPrompt;
  }

  /**
   * 定期清理过期上下文
   */
  startCleanup() {
    setInterval(() => {
      const now = new Date();
      let cleanedCount = 0;

      for (const [sessionId, context] of this.contexts.entries()) {
        // 检查会话是否过期
        if (context.length > 0) {
          const lastMessage = context[context.length - 1];
          const age = now - new Date(lastMessage.timestamp);

          if (age > this.config.maxContextAge) {
            this.contexts.delete(sessionId);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info('定期清理过期上下文', {
          cleanedCount,
          remainingSessions: this.contexts.size
        });
      }
    }, this.config.cleanupInterval);
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    let totalMessages = 0;

    for (const context of this.contexts.values()) {
      totalMessages += context.length;
    }

    return {
      activeSessions: this.contexts.size,
      totalMessages: totalMessages,
      avgMessagesPerSession: this.contexts.size > 0 ? Math.round(totalMessages / this.contexts.size) : 0
    };
  }
}

// 导出单例
module.exports = new ContextManager();
