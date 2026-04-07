/**
 * 检查数据库表结构的临时脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

const mysql = require('mysql2/promise');

async function checkTables() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'education_system'
    });

    console.log('📊 正在检查数据库表结构...\n');

    // 检查students表
    console.log('=== students 表结构 ===');
    const [students] = await conn.query('DESCRIBE students');
    students.forEach(col => {
        console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null.padEnd(5)} ${col.Key}`);
    });

    console.log('\n=== scholarships 表结构 ===');
    const [scholarships] = await conn.query('DESCRIBE scholarships');
    scholarships.forEach(col => {
        console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null.padEnd(5)} ${col.Key}`);
    });

    console.log('\n=== classes 表结构 ===');
    const [classes] = await conn.query('DESCRIBE classes');
    classes.forEach(col => {
        console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null.padEnd(5)} ${col.Key}`);
    });

    console.log('\n=== majors 表结构 ===');
    try {
        const [majors] = await conn.query('DESCRIBE majors');
        majors.forEach(col => {
            console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null.padEnd(5)} ${col.Key}`);
        });
    } catch (error) {
        console.log('  ⚠️ majors表不存在');
    }

    // 检查scholarships表的外键关系
    console.log('\n=== scholarships 表的CREATE语句 ===');
    const [createScholarship] = await conn.query('SHOW CREATE TABLE scholarships');
    console.log(createScholarship[0]['Create Table']);

    await conn.end();
    console.log('\n✅ 检查完成！');
}

checkTables().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
});
