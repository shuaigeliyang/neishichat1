/**
 * 数据库检查和修复脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 功能：
 * 1. 检查chat_history表是否存在
 * 2. 检查表结构是否正确
 * 3. 查看历史记录数量
 * 4. 测试查询功能
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'education_system'
  });

  try {
    console.log('🔍 开始检查数据库...\n');

    // 1. 检查表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'chat_history'
    `, [process.env.DB_NAME || 'education_system']);

    if (tables.length === 0) {
      console.log('❌ chat_history表不存在！\n');
      console.log('正在创建表...\n');

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_history (
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
    } else {
      console.log('✅ chat_history表存在');
      console.log(`   - 行数: ${tables[0].TABLE_ROWS}`);
      console.log(`   - 创建时间: ${tables[0].CREATE_TIME}\n`);
    }

    // 2. 检查表结构
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'chat_history'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'education_system']);

    console.log('📋 表结构:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log();

    // 3. 查询历史记录数量
    const [countResult] = await connection.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM chat_history
    `);

    console.log('📊 历史记录统计:');
    console.log(`   - 总记录数: ${countResult[0].total}`);
    console.log(`   - 用户数: ${countResult[0].unique_users}`);
    console.log(`   - 会话数: ${countResult[0].unique_sessions}\n`);

    // 4. 显示最近的记录
    const [recentRecords] = await connection.execute(`
      SELECT
        chat_id,
        user_type,
        user_id,
        SUBSTRING(user_question, 1, 50) as question_preview,
        intent,
        session_id,
        created_at
      FROM chat_history
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (recentRecords.length > 0) {
      console.log('📝 最近的10条记录:');
      console.log('ID\t用户\t问题\t\t\t意图\t时间');
      console.log('-'.repeat(100));
      recentRecords.forEach(r => {
        console.log(`${r.chat_id}\t${r.user_type}:${r.user_id}\t${r.question_preview}...\t\t${r.intent || 'chat'}\t${r.created_at}`);
      });
      console.log();
    } else {
      console.log('ℹ️  暂无历史记录\n');
    }

    // 5. 按用户统计
    const [userStats] = await connection.execute(`
      SELECT
        user_type,
        user_id,
        COUNT(*) as count,
        MAX(created_at) as last_active
      FROM chat_history
      GROUP BY user_type, user_id
      ORDER BY count DESC
      LIMIT 5
    `);

    if (userStats.length > 0) {
      console.log('👥 最活跃的用户:');
      userStats.forEach(u => {
        console.log(`   - ${u.user_type}:${u.user_id} (${u.count}条记录, 最后活跃: ${u.last_active})`);
      });
      console.log();
    }

    // 6. 检查索引
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM chat_history
    `);

    console.log('🔑 索引:');
    const uniqueIndexes = [...new Set(indexes.map(i => i.Key_name))];
    uniqueIndexes.forEach(idx => {
      const indexColumns = indexes
        .filter(i => i.Key_name === idx)
        .map(i => i.Column_name)
        .join(', ');
      console.log(`   - ${idx}: (${indexColumns})`);
    });
    console.log();

    console.log('✅ 检查完成！\n');

    // 7. 提供测试建议
    if (countResult[0].total === 0) {
      console.log('💡 建议：');
      console.log('   1. 登录系统');
      console.log('   2. 进入智能助手页面');
      console.log('   3. 发送一条消息（如："你好"）');
      console.log('   4. 刷新页面，点击"历史记录"按钮');
      console.log('   5. 重新运行此脚本查看数据\n');
    }

  } catch (error) {
    console.error('❌ 检查出错:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 提示：请检查数据库用户名和密码是否正确\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示：请确保MySQL服务已启动\n');
    }
  } finally {
    await connection.end();
  }
}

checkDatabase();
