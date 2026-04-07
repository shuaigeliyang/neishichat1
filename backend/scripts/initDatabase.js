/**
 * 数据库初始化脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 * 运行方式：node scripts/initDatabase.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function initDatabase() {
  console.log('\n========================================');
  console.log('  学生教育系统 - 数据库初始化');
  console.log('========================================\n');

  let connection;

  try {
    // 连接MySQL服务器
    console.log('正在连接MySQL服务器...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 连接成功！\n');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../database/schema.sql');
    console.log('正在读取SQL文件...');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('✓ 读取成功！\n');

    // 执行SQL
    console.log('正在创建数据库和表...');
    await connection.query(sql);
    console.log('✓ 数据库和表创建成功！\n');

    console.log('========================================');
    console.log('  数据库初始化完成！');
    console.log('========================================');
    console.log(`  数据库名：${process.env.DB_NAME || 'education_system'}`);
    console.log(`  主机：${dbConfig.host}:${dbConfig.port}`);
    console.log('========================================\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ 数据库初始化失败！');
    console.error('错误信息：', error.message);
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
