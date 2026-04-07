/**
 * 测试数据库查询
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const { query } = require('../src/config/database');

async function testQueries() {
  try {
    console.log('🔍 开始测试数据库查询...\n');

    // 1. 测试基本查询
    console.log('1️⃣ 测试基本查询...');
    const [result1] = await query('SELECT 1 as test');
    console.log('✅ 基本查询成功:', result1[0], '\n');

    // 2. 检查chat_history表
    console.log('2️⃣ 检查chat_history表...');
    const [tables] = await query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'chat_history'
    `);

    if (tables.length === 0) {
      console.log('❌ chat_history表不存在！');
      return;
    }
    console.log('✅ chat_history表存在\n');

    // 3. 查询表结构
    console.log('3️⃣ 查询表结构...');
    const columns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'chat_history'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('表结构:');
    columns.forEach(col => console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`));
    console.log();

    // 4. 测试查询历史记录（模拟学生ID=1）
    console.log('4️⃣ 测试查询历史记录...');
    const history = await query(`
      SELECT chat_id, user_type, user_id, user_question,
             ai_answer, intent, session_id, created_at
      FROM chat_history
      WHERE user_type = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, ['student', 1]);

    console.log(`✅ 查询成功！找到 ${history.length} 条记录`);
    if (history.length > 0) {
      console.log('第一条记录:', history[0]);
    }
    console.log();

    // 5. 测试插入
    console.log('5️⃣ 测试插入记录...');
    const insertResult = await query(`
      INSERT INTO chat_history (user_type, user_id, user_question, ai_answer, intent, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['student', 1, '测试消息', '测试回复', 'chat', 'test-session-' + Date.now()]);

    console.log(`✅ 插入成功！ID: ${insertResult.insertId}\n`);

    // 6. 测试更新
    console.log('6️⃣ 测试更新记录...');
    const updateResult = await query(`
      UPDATE chat_history
      SET ai_answer = ?
      WHERE chat_id = ?
    `, ['更新的测试回复', insertResult.insertId]);

    console.log(`✅ 更新成功！影响行数: ${updateResult.affectedRows}\n`);

    console.log('🎉 所有测试通过！数据库功能正常！\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    console.error('\n错误代码:', error.code);
    console.error('SQL状态:', error.sqlState);
    console.error('SQL消息:', error.sqlMessage);
  }

  process.exit(0);
}

testQueries();
