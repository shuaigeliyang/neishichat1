/**
 * chat_history表初始化脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 用法：在backend目录运行
 * node scripts/initChatHistory.js
 */

const { query } = require('../src/config/database');

async function initChatHistoryTable() {
  try {
    console.log('🔍 检查chat_history表是否存在...\n');

    // 检查表是否存在
    const [tables] = await query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'chat_history'
    `);

    if (tables.length > 0) {
      console.log('✅ chat_history表已存在\n');

      // 查询记录数
      const [count] = await query(`SELECT COUNT(*) as total FROM chat_history`);
      console.log(`📊 当前记录数: ${count[0].total}\n`);

    } else {
      console.log('❌ chat_history表不存在，开始创建...\n');

      // 创建表
      await query(`
        CREATE TABLE chat_history (
          chat_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '对话ID',
          user_type ENUM('student', 'teacher', 'admin') NOT NULL COMMENT '用户类型',
          user_id INT NOT NULL COMMENT '用户ID',
          user_question TEXT NOT NULL COMMENT '用户问题',
          ai_answer TEXT COMMENT 'AI回答',
          intent VARCHAR(100) COMMENT '识别的意图',
          sql_query TEXT COMMENT '生成的SQL（如果有）',
          query_result TEXT COMMENT '查询结果摘要',
          satisfaction TINYINT COMMENT '满意度评分（1-5分）',
          session_id VARCHAR(100) COMMENT '会话ID（用于关联多轮对话）',
          ip_address VARCHAR(50) COMMENT 'IP地址',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          INDEX idx_user (user_type, user_id),
          INDEX idx_session (session_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话历史表'
      `);

      console.log('✅ chat_history表创建成功！\n');
      console.log('📋 表结构:');
      console.log('   - chat_id: INT (主键，自增)');
      console.log('   - user_type: ENUM (student/teacher/admin)');
      console.log('   - user_id: INT');
      console.log('   - user_question: TEXT');
      console.log('   - ai_answer: TEXT');
      console.log('   - intent: VARCHAR(100)');
      console.log('   - session_id: VARCHAR(100)');
      console.log('   - created_at: TIMESTAMP\n');
    }

    console.log('🎉 初始化完成！');
    console.log('\n💡 现在可以启动后端服务：');
    console.log('   npm run dev\n');
    console.log('💡 或者如果已经运行，重启后端服务：');
    console.log('   按 Ctrl+C 停止，然后 npm run dev\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    console.error('\n详细错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initChatHistoryTable();
}

module.exports = { initChatHistoryTable };
