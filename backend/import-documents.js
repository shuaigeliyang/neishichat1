/**
 * 导入文档到数据库
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：将document_chunks.json导入MySQL数据库
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/.env' });

console.log('='.repeat(60));
console.log('🚀 导入文档到数据库');
console.log('='.repeat(60));

async function main() {
    // 加载文档块
    console.log('\n📦 第1步：加载文档块...');
    const chunks = JSON.parse(fs.readFileSync('./document_chunks.json', 'utf-8'));
    console.log(`✓ 加载了${chunks.length}个文档块`);

    // 连接数据库
    console.log('\n📦 第2步：连接数据库...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    console.log('✓ 数据库连接成功');

    // 清空旧数据
    console.log('\n📦 第3步：清空旧数据...');
    await connection.query('TRUNCATE TABLE document_chunks');
    console.log('✓ 旧数据已清空');

    // 准备插入语句
    console.log('\n📦 第4步：导入数据...');

    let successCount = 0;
    let errorCount = 0;

    // 逐条插入（更可靠）
    const insertSQL = `
        INSERT INTO document_chunks (chapter_title, chapter_num, page_number, paragraph_num, text, source_file)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const values = [
            chunk.chapter_title || '未知章节',
            chunk.chapter_number || '',
            chunk.page_number || 0,
            chunk.paragraph_num || 0,
            chunk.full_context || chunk.text,
            'student_handbook_2025'
        ];

        try {
            await connection.query(insertSQL, values);
            successCount++;

            if ((i + 1) % 500 === 0) {
                const progress = Math.floor((i + 1) / chunks.length * 100);
                process.stdout.write(`\r  进度: ${progress}% (${i + 1}/${chunks.length})`);
            }
        } catch (error) {
            errorCount++;
            if (errorCount <= 3) {
                console.error(`\n  ❌ 第${i + 1}条插入失败：${error.message}`);
            }
        }
    }

    console.log('\n');

    // 验证数据
    console.log('\n📦 第5步：验证数据...');
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM document_chunks');
    console.log(`✓ 数据库中共有${countResult[0].count}条记录`);

    // 显示样例数据
    console.log('\n📋 样例数据（前3条）：');
    const [samples] = await connection.query('SELECT * FROM document_chunks LIMIT 3');
    samples.forEach((row, i) => {
        console.log(`  ${i + 1}. [${row.chapter_title}] 第${row.page_number}页`);
        console.log(`     ${row.text.substring(0, 80)}...`);
    });

    await connection.end();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 导入完成！');
    console.log(`  - 成功：${successCount}条`);
    console.log(`  - 失败：${errorCount}条`);
    console.log('='.repeat(60));
}

main().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('\n❌ 失败：', error);
    process.exit(1);
});
