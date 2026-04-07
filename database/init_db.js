/**
 * 数据库初始化脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 *
 * 用法：node init_db.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 读取.env文件
const envPath = path.join(__dirname, '../backend/.env');
const envConfig = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      envConfig[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const config = {
  host: envConfig.DB_HOST || 'localhost',
  port: parseInt(envConfig.DB_PORT) || 3306,
  user: envConfig.DB_USER || 'root',
  password: envConfig.DB_PASSWORD || 'root',
  database: envConfig.DB_NAME || 'education_system'
};

async function initDatabase() {
  let connection;

  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 检查chat_history表是否存在
    console.log('🔍 检查chat_history表...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'chat_history'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('✅ chat_history表已存在\n');

      // 显示表结构
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'chat_history'
        ORDER BY ORDINAL_POSITION
      `, [config.database]);

      console.log('📋 表结构:');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
      });
      console.log();

      // 查询记录数
      const [count] = await connection.execute(`
        SELECT COUNT(*) as total FROM chat_history
      `);
      console.log(`📊 当前记录数: ${count[0].total}\n`);

    } else {
      console.log('❌ chat_history表不存在，开始创建...\n');

      // 创建表
      await connection.execute(`
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

      // 插入测试数据
      console.log('📝 插入测试数据...');
      await connection.execute(`
        INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['student', 1, '你好', '你好！我是小智，你的智能学习助手～有什么我可以帮助你的吗？', 'chat', 'test-session-001']);

      console.log('✅ 测试数据插入成功！\n');
    }

    console.log('🎉 初始化完成！\n');
    console.log('💡 现在可以启动后端服务了：');
    console.log('   cd backend');
    console.log('   npm run dev\n');

  } catch (error) {
    console.error('❌ 初始化失败:', error.message);

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 提示：数据库用户名或密码错误');
      console.log('   请检查 backend/.env 文件中的数据库配置\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示：无法连接到MySQL服务');
      console.log('   请确保MySQL服务已启动\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 提示：数据库不存在');
      console.log(`   请先创建数据库: CREATE DATABASE ${config.database};\n`);
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
