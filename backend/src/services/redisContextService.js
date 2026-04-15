/**
 * Redis上下文管理服务（性能优化版）
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：使用Redis缓存对话上下文，提升性能
 */

const { query } = require('../config/database');
const redis = require('redis');

class RedisContextService {
  constructor() {
    this.redisClient = null;
    this.useRedis = false; // 是否使用Redis（如果连接失败会自动降级到内存）
    this.memoryCache = new Map(); // 降级方案：内存缓存

    this.initRedis();
  }

  /**
   * 初始化Redis连接
   */
  async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisClient = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis重连次数过多，切换到内存缓存');
              this.useRedis = false;
              return new Error('Redis连接失败');
            }
            return retries * 100;
          }
        }
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis错误，切换到内存缓存:', err.message);
        this.useRedis = false;
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis连接成功');
        this.useRedis = true;
      });

      await this.redisClient.connect();
      this.useRedis = true;

      console.log('✨ Redis上下文缓存已启用');

    } catch (error) {
      console.warn('⚠️ Redis初始化失败，使用内存缓存:', error.message);
      this.useRedis = false;
    }
  }

  /**
   * 获取会话上下文
   * @param {string} sessionId - 会话ID
   * @param {number} maxTurns - 最大轮数
   * @returns {Promise<Array>} 消息历史
   */
  async getContext(sessionId, maxTurns = 5) {
    try {
      const cacheKey = `context:${sessionId}`;

      // 优先从Redis获取
      if (this.useRedis && this.redisClient) {
        try {
          const cached = await this.redisClient.get(cacheKey);
          if (cached) {
            const messages = JSON.parse(cached);
            console.log('✅ 从Redis获取上下文', { sessionId, messagesCount: messages.length });
            return messages.slice(-maxTurns * 2);
          }
        } catch (err) {
          console.warn('⚠️ Redis读取失败，使用数据库:', err.message);
        }
      }

      // 从内存缓存获取
      const cached = this.memoryCache.get(cacheKey);
      if (cached && cached.messages.length > 0) {
        console.log('✅ 从内存获取上下文', { sessionId, messagesCount: cached.messages.length });
        return cached.messages.slice(-maxTurns * 2);
      }

      // 从数据库获取（本小姐的修复：LIMIT不使用参数绑定）
      const history = await query(`
        SELECT user_question, ai_answer, created_at
        FROM chat_history
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ${parseInt(maxTurns)}
      `, [sessionId]);

      // 构建消息数组（倒序，从早到晚）
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

      // 缓存到Redis或内存
      await this.setContext(sessionId, messages);

      console.log('✅ 从数据库获取上下文', { sessionId, messagesCount: messages.length });
      return messages;

    } catch (error) {
      console.error('❌ 获取上下文失败', { error: error.message, sessionId });
      return [];
    }
  }

  /**
   * 设置会话上下文
   * @param {string} sessionId - 会话ID
   * @param {Array} messages - 消息数组
   */
  async setContext(sessionId, messages) {
    try {
      const cacheKey = `context:${sessionId}`;

      // 限制最大消息数
      if (messages.length > 20) {
        messages = messages.slice(-20);
      }

      // 缓存到Redis（30分钟过期）
      if (this.useRedis && this.redisClient) {
        try {
          await this.redisClient.setEx(cacheKey, 1800, JSON.stringify(messages));
          console.log('✅ 上下文已缓存到Redis', { sessionId, messagesCount: messages.length });
          return;
        } catch (err) {
          console.warn('⚠️ Redis写入失败，使用内存缓存:', err.message);
        }
      }

      // 降级到内存缓存
      this.memoryCache.set(cacheKey, {
        messages,
        createdAt: Date.now()
      });
      console.log('✅ 上下文已缓存到内存', { sessionId, messagesCount: messages.length });

    } catch (error) {
      console.error('❌ 设置上下文失败', { error: error.message });
    }
  }

  /**
   * 更新上下文缓存
   * @param {string} sessionId - 会话ID
   * @param {string} userQuestion - 用户问题
   * @param {string} aiAnswer - AI回答
   */
  async updateContext(sessionId, userQuestion, aiAnswer) {
    try {
      const cacheKey = `context:${sessionId}`;
      const cached = this.memoryCache.get(cacheKey) || { messages: [] };

      cached.messages.push({
        role: 'user',
        content: userQuestion
      });

      cached.messages.push({
        role: 'assistant',
        content: this.extractTextFromAnswer(aiAnswer)
      });

      // 限制最大消息数
      if (cached.messages.length > 20) {
        cached.messages = cached.messages.slice(-20);
      }

      await this.setContext(sessionId, cached.messages);

    } catch (error) {
      console.error('❌ 更新上下文失败', { error: error.message });
    }
  }

  /**
   * 清除会话上下文
   * @param {string} sessionId - 会话ID
   */
  async clearContext(sessionId) {
    try {
      const cacheKey = `context:${sessionId}`;

      // 从Redis删除
      if (this.useRedis && this.redisClient) {
        try {
          await this.redisClient.del(cacheKey);
        } catch (err) {
          console.warn('⚠️ Redis删除失败:', err.message);
        }
      }

      // 从内存删除
      this.memoryCache.delete(cacheKey);

      console.log('🗑️ 清除上下文', { sessionId });

    } catch (error) {
      console.error('❌ 清除上下文失败', { error: error.message });
    }
  }

  /**
   * 从AI回答中提取纯文本
   * @param {string} answer - AI回答
   * @returns {string} 纯文本
   */
  extractTextFromAnswer(answer) {
    try {
      if (answer && answer.trim && answer.trim().startsWith('{')) {
        const parsed = JSON.parse(answer);
        if (parsed.type === 'query' || parsed.type === 'profile' || parsed.type === 'grades') {
          return parsed.message || parsed.data?.message || '查询完成';
        }
      }
      if (answer && answer.length) {
        return answer.length > 500 ? answer.substring(0, 500) + '...' : answer;
      }
      return answer || '';
    } catch (e) {
      if (answer && answer.length) {
        return answer.length > 500 ? answer.substring(0, 500) + '...' : answer;
      }
      return answer || '';
    }
  }

  /**
   * 获取上下文统计信息
   */
  async getStats() {
    const stats = {
      useRedis: this.useRedis,
      memoryContexts: this.memoryCache.size,
      redisConnected: this.redisClient?.isOpen || false
    };

    if (this.useRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys('context:*');
        stats.redisContexts = keys.length;
      } catch (err) {
        stats.redisContexts = 0;
      }
    }

    return stats;
  }

  /**
   * 关闭Redis连接
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('✅ Redis连接已关闭');
    }
  }
}

// 导出单例
module.exports = new RedisContextService();
