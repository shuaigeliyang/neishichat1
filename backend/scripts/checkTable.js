/**
 * 快速检查chat_history表结构
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const { query } = require('../src/config/database');

async function checkTable() {
  try {
    console.log('🔍 检查chat_history表...\n');

    // 1. 检查表是否存在
    const [tables] = await query(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'chat_history'
    `);

    if (tables.length === 0) {
      console.log('❌ 表不存在！');
      return;
    }

    console.log('✅ 表存在');
    console.log(`   行数: ${tables[0].TABLE_ROWS}`);
    console.log(`   创建时间: ${tables[0].CREATE_TIME}\n`);

    // 2. 检查表结构
    const [columns] = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'chat_history'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📋 表结构:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_KEY === 'PRI' ? '(PK)' : ''}`);
    });
    console.log();

    // 3. 测试查询
    console.log('🧪 测试查询...');
    const [testResult] = await query(`
      SELECT COUNT(*) as total
      FROM chat_history
    `);
    console.log(`✅ 查询成功！总记录数: ${testResult[0].total}\n`);

    // 4. 查询前3条记录
    const [recentRecords] = await query(`
      SELECT chat_id, user_type, user_id,
             SUBSTRING(user_question, 1, 30) as question,
             intent, created_at
      FROM chat_history
      ORDER BY created_at DESC
      LIMIT 3
    `);

    if (recentRecords.length > 0) {
      console.log('📝 最近的记录:');
      recentRecords.forEach(r => {
        console.log(`   [${r.chat_id}] ${r.user_type}:${r.user_id} - ${r.question}... (${r.intent})`);
      });
    } else {
      console.log('ℹ️  暂无记录');
    }
    console.log();

    console.log('✅ 检查完成！表结构正常。\n');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error('详细错误:', error);
  }

  process.exit(0);
}

checkTable();
