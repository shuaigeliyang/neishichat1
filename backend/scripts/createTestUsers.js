/**
 * 创建测试用户脚本（修正版）
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：创建专门的测试账号
 */

require('dotenv').config();
const { query } = require('../src/config/database');
const bcrypt = require('bcrypt');

async function createTestUsers() {
  try {
    console.log('🚀 开始创建专门的测试账号...\n');

    // 生成密码哈希
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('📝 创建测试学生账号...\n');

    // 创建测试学生（使用现有的第一个班级）
    const classes = await query('SELECT class_id, class_name FROM classes LIMIT 1');
    if (classes.length === 0) {
      throw new Error('没有找到班级，请先创建班级');
    }
    const classId = classes[0].class_id;
    console.log(`使用班级: ${classes[0].class_name} (ID: ${classId})\n`);

    // 删除已存在的测试用户
    await query('DELETE FROM students WHERE student_code LIKE ?', ['TEST%']);
    console.log('清理旧的测试账号...\n');

    // 创建新的测试学生
    const testStudents = [
      { code: 'TEST_STUDENT', name: '测试学生', gender: '男' }
    ];

    for (const student of testStudents) {
      await query(`
        INSERT INTO students (student_code, name, gender, class_id, phone, email, enrollment_date, status, password)
        VALUES (?, ?, ?, ?, '13800000000', 'test@edu.cn', CURDATE(), '在读', ?)
      `, [student.code, student.name, student.gender, classId, hashedPassword]);
      console.log(`✅ 学生创建成功: ${student.name} (${student.code})`);
    }

    console.log('\n📝 创建测试教师账号...\n');

    // 获取第一个学院
    const colleges = await query('SELECT college_id, college_name FROM colleges LIMIT 1');
    if (colleges.length === 0) {
      throw new Error('没有找到学院，请先创建学院');
    }
    const collegeId = colleges[0].college_id;
    console.log(`使用学院: ${colleges[0].college_name} (ID: ${collegeId})\n`);

    // 删除已存在的测试教师
    await query('DELETE FROM teachers WHERE teacher_code LIKE ?', ['TEST%']);
    console.log('清理旧的测试教师账号...\n');

    // 创建新的测试教师
    const testTeachers = [
      { code: 'TEST_TEACHER', name: '测试教师', gender: '女', title: '教授' }
    ];

    for (const teacher of testTeachers) {
      await query(`
        INSERT INTO teachers (teacher_code, name, gender, college_id, title, phone, email, password, status)
        VALUES (?, ?, ?, ?, ?, '13900000000', 'test_teacher@edu.cn', ?, 1)
      `, [teacher.code, teacher.name, teacher.gender, collegeId, teacher.title, hashedPassword]);
      console.log(`✅ 教师创建成功: ${teacher.name} (${teacher.code})`);
    }

    console.log('\n🎉 所有测试账号创建完成！\n');

    // 显示创建的账号信息
    console.log('========================================');
    console.log('  测试账号信息');
    console.log('========================================\n');

    console.log('👨‍🎓 学生测试账号:');
    console.log('  用户名: TEST_STUDENT');
    console.log('  密码: 123456');
    console.log('  姓名: 测试学生\n');

    console.log('👨‍🏫 教师测试账号:');
    console.log('  用户名: TEST_TEACHER');
    console.log('  密码: 123456');
    console.log('  姓名: 测试教师\n');

    console.log('👨‍💼 管理员账号:');
    console.log('  提示：管理员登录需要特殊处理');
    console.log('  用户名: admin');
    console.log('  密码: admin123\n');

    console.log('========================================\n');

    console.log('💡 提示：现有数据统计\n');

    const studentCount = await query('SELECT COUNT(*) as count FROM students');
    const teacherCount = await query('SELECT COUNT(*) as count FROM teachers');

    console.log(`  学生总数: ${studentCount[0].count}`);
    console.log(`  教师总数: ${teacherCount[0].count}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ 创建测试账号失败:', error.message);
    process.exit(1);
  }
}

// 执行创建
createTestUsers();
