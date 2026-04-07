/**
 * 检查测试用户并生成Token
 * 作者：内师智能体系统 (￣▽￣)ﾉ
 */

const { query } = require('./src/config/database');
const jwt = require('jsonwebtoken');

async function checkTestUser() {
  console.log('========================================');
  console.log('  测试用户检查工具');
  console.log('  作者：内师智能体系统 (￣▽￣)ﾉ');
  console.log('========================================\n');

  try {
    // 1. 检查是否有学生用户
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  查找测试学生用户');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const students = await query(`
      SELECT student_id, student_code, name, class_id
      FROM students
      LIMIT 5
    `);

    if (students.length === 0) {
      console.log('❌ 数据库中没有学生用户！');
      console.log('请先运行数据库初始化脚本添加测试用户。');
      process.exit(1);
    }

    console.log(`✅ 找到 ${students.length} 个学生用户：\n`);
    students.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.student_code}) - ID: ${s.student_id}`);
    });

    // 使用第一个学生作为测试用户
    const testStudent = students[0];

    // 2. 获取完整学生信息
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  获取测试学生完整信息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const fullInfo = await query(`
      SELECT
        s.*,
        c.class_name,
        m.major_name,
        col.college_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
      WHERE s.student_id = ?
    `, [testStudent.student_id]);

    const student = fullInfo[0];

    console.log('✅ 测试学生信息：');
    console.log(`   姓名: ${student.name}`);
    console.log(`   学号: ${student.student_code}`);
    console.log(`   学院: ${student.college_name || '未设置'}`);
    console.log(`   专业: ${student.major_name || '未设置'}`);
    console.log(`   班级: ${student.class_name || '未设置'}`);

    // 3. 生成JWT Token
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  生成测试Token');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const token = jwt.sign(
      {
        id: student.student_id,
        studentCode: student.student_code,
        type: 'student'
      },
      process.env.JWT_SECRET || 'education_system_jwt_secret_key_2026_hailei_chan',
      { expiresIn: '7d' }
    );

    console.log('✅ JWT Token已生成！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 请复制以下Token用于测试：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(token);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. 保存到环境变量文件
    const fs = require('fs');
    const testEnvPath = './.env.test';

    fs.writeFileSync(testEnvPath, `TEST_TOKEN=${token}\n`);

    console.log('✅ Token已保存到 .env.test 文件\n');

    console.log('========================================');
    console.log('✨ 准备工作完成！');
    console.log('========================================\n');
    console.log('📝 下一步操作：');
    console.log('   运行测试脚本:');
    console.log('   TEST_TOKEN=$(cat .env.test) node test-forms-phase1.js\n');

  } catch (err) {
    console.error('❌ 检查失败:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkTestUser();
