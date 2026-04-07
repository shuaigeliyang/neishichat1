/**
 * 测试数据生成脚本
 * @author 内师智能体系统 (￣▽￣)ﾉ
 * 运行方式：node scripts/generateTestData.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'education_system'
};

// 随机数据工具
const random = {
  int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  item: (arr) => arr[Math.floor(Math.random() * arr.length)],
  phone: () => `1${random.int(3, 9)}${random.int(100000000, 999999999)}`,
  idCard: () => `${random.int(110000, 659005)}${random.int(1900, 2005)}${random.int(1, 12).toString().padStart(2, '0')}${random.int(1, 28).toString().padStart(2, '0')}${random.int(1000, 9999)}`
};

// 测试数据
const colleges = [
  { name: '计算机科学与技术学院', code: 'CS', dean: '张教授' },
  { name: '软件工程学院', code: 'SE', dean: '李教授' },
  { name: '信息管理学院', code: 'IM', dean: '王教授' },
  { name: '电子工程学院', code: 'EE', dean: '赵教授' },
  { name: '人工智能学院', code: 'AI', dean: '刘教授' }
];

const majors = [
  { name: '计算机科学与技术', code: 'CS001', degree: '本科', duration: 4, college: 0 },
  { name: '软件工程', code: 'SE001', degree: '本科', duration: 4, college: 1 },
  { name: '数据科学与大数据技术', code: 'DS001', degree: '本科', duration: 4, college: 0 },
  { name: '信息管理与信息系统', code: 'IM001', degree: '本科', duration: 4, college: 2 },
  { name: '电子信息工程', code: 'EE001', degree: '本科', duration: 4, college: 3 },
  { name: '人工智能', code: 'AI001', degree: '本科', duration: 4, college: 4 }
];

const firstNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '秀英', '娟', '英', '华'];
const lastNames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何', '罗', '高', '林'];

const courseTypes = ['公共基础课', '专业基础课', '专业必修课', '专业选修课', '公共选修课'];
const courses = [
  { name: '高等数学', code: 'MATH101', credit: 5, type: '公共基础课', hours: 80 },
  { name: '大学英语', code: 'ENG101', credit: 4, type: '公共基础课', hours: 64 },
  { name: '数据结构', code: 'CS201', credit: 4, type: '专业必修课', hours: 64 },
  { name: '算法分析', code: 'CS202', credit: 3, type: '专业必修课', hours: 48 },
  { name: '操作系统', code: 'CS301', credit: 4, type: '专业必修课', hours: 64 },
  { name: '计算机网络', code: 'CS302', credit: 3, type: '专业必修课', hours: 48 },
  { name: '数据库原理', code: 'CS303', credit: 3, type: '专业必修课', hours: 48 },
  { name: '软件工程', code: 'SE301', credit: 3, type: '专业必修课', hours: 48 },
  { name: 'Web开发技术', code: 'SE401', credit: 2, type: '专业选修课', hours: 32 },
  { name: '人工智能导论', code: 'AI101', credit: 3, type: '专业选修课', hours: 48 }
];

const regulationCategories = ['学生管理', '教学管理', '奖助学金', '学籍管理', '宿舍管理'];
const regulations = [
  { title: '学生学籍管理规定', category: '学籍管理', version: 'v1.0' },
  { title: '学生奖励办法', category: '奖助学金', version: 'v1.0' },
  { title: '学生违纪处分规定', category: '学生管理', version: 'v1.0' },
  { title: '课程考核管理办法', category: '教学管理', version: 'v1.0' },
  { title: '学生宿舍管理规定', category: '宿舍管理', version: 'v1.0' }
];

const formCategories = ['申请表', '证明表', '统计表'];
const forms = [
  { name: '学生请假申请表', category: '申请表', target: '全体学生' },
  { name: '在校证明申请表', category: '证明表', target: '全体学生' },
  { name: '奖学金申请表', category: '申请表', target: '全体学生' },
  { name: '成绩单打印申请', category: '证明表', target: '全体学生' },
  { name: '教室使用申请表', category: '申请表', target: '全体教师' }
];

async function generateName() {
  return random.item(lastNames) + random.item(firstNames);
}

async function generateTestData() {
  console.log('\n========================================');
  console.log('  学生教育系统 - 测试数据生成');
  console.log('========================================\n');

  let connection;

  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 连接成功！\n');

    // 1. 插入学院
    console.log('正在插入学院数据...');
    for (const college of colleges) {
      await connection.query(
        'INSERT INTO colleges (college_name, college_code, dean_name, contact_phone, status) VALUES (?, ?, ?, ?, 1)',
        [college.name, college.code, college.dean, random.phone()]
      );
    }
    console.log(`✓ 插入 ${colleges.length} 个学院\n`);

    // 2. 插入专业
    console.log('正在插入专业数据...');
    for (const major of majors) {
      await connection.query(
        'INSERT INTO majors (major_name, major_code, college_id, degree_type, duration, status) VALUES (?, ?, ?, ?, ?, 1)',
        [major.name, major.code, major.college + 1, major.degree, major.duration]
      );
    }
    console.log(`✓ 插入 ${majors.length} 个专业\n`);

    // 3. 插入班级（每个专业创建3个年级的班级）
    console.log('正在插入班级数据...');
    let classId = 1;
    const classMap = new Map();
    for (let m = 0; m < majors.length; m++) {
      for (let year = 2022; year <= 2024; year++) {
        const className = `${majors[m].code}${year}01`;
        await connection.query(
          'INSERT INTO classes (class_name, class_code, major_id, grade, status) VALUES (?, ?, ?, ?, 1)',
          [`${majors[m].name}${year}级1班`, className, m + 1, year]
        );
        classMap.set(`${m}-${year}`, classId++);
      }
    }
    console.log(`✓ 插入 ${classId - 1} 个班级\n`);

    // 4. 插入教师（每个学院10个教师）
    console.log('正在插入教师数据...');
    const teacherPassword = await bcrypt.hash('123456', 10);
    let teacherId = 1;
    const teacherIds = [];
    for (let c = 0; c < colleges.length; c++) {
      for (let i = 0; i < 10; i++) {
        const name = await generateName();
        const code = `T${(c + 1).toString().padStart(2, '0')}${(i + 1).toString().padStart(3, '0')}`;
        await connection.query(
          `INSERT INTO teachers (teacher_code, name, gender, college_id, title, education, phone, email, password, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [code, name, random.item(['男', '女']), c + 1, random.item(['讲师', '副教授', '教授']), random.item(['硕士', '博士']), random.phone(), `${code}@edu.cn`, teacherPassword]
        );
        teacherIds.push(teacherId++);
      }
    }
    console.log(`✓ 插入 ${teacherIds.length} 个教师\n`);

    // 5. 插入学生（每个班级30个学生）
    console.log('正在插入学生数据...');
    const studentPassword = await bcrypt.hash('123456', 10);
    let studentId = 1;
    const studentCodes = [];
    for (let m = 0; m < majors.length; m++) {
      for (let year = 2022; year <= 2024; year++) {
        const currentClassId = classMap.get(`${m}-${year}`);
        for (let i = 0; i < 30; i++) {
          const name = await generateName();
          const code = `S${year.toString().slice(2)}${(m + 1).toString().padStart(2, '0')}${(i + 1).toString().padStart(3, '0')}`;
          await connection.query(
            `INSERT INTO students (student_code, name, gender, class_id, phone, email, enrollment_date, political_status, nation, status, password)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, name, random.item(['男', '女']), currentClassId, random.phone(), `${code}@edu.cn`, `${year}-09-01`, random.item(['群众', '团员', '党员']), '汉族', '在读', studentPassword]
          );
          studentCodes.push({ code, id: studentId++, classId: currentClassId, name });
        }
      }
    }
    console.log(`✓ 插入 ${studentId - 1} 个学生\n`);

    // 6. 插入课程
    console.log('正在插入课程数据...');
    for (const course of courses) {
      await connection.query(
        'INSERT INTO courses (course_code, course_name, course_type, credits, total_hours, theory_hours, practice_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [course.code, course.name, course.type, course.credit, course.hours, Math.floor(course.hours * 0.7), Math.floor(course.hours * 0.3)]
      );
    }
    console.log(`✓ 插入 ${courses.length} 个课程\n`);

    // 7. 插入开课计划
    console.log('正在插入开课计划...');
    let offeringId = 1;
    const semesters = ['2023-2024-1', '2023-2024-2', '2024-2025-1'];
    for (const semester of semesters) {
      for (let c = 1; c <= courses.length; c++) {
        const teacherIdx = random.int(0, teacherIds.length - 1);
        await connection.query(
          `INSERT INTO course_offerings (course_id, teacher_id, semester, class_id, schedule, classroom, status)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [c, teacherIds[teacherIdx], semester, random.int(1, classId - 1), `周${random.int(1, 5)} ${random.int(1, 8)}节`, `A${random.int(101, 502)}`]
        );
        offeringId++;
      }
    }
    console.log(`✓ 插入 ${offeringId - 1} 个开课计划\n`);

    // 8. 插入成绩
    console.log('正在插入学生成绩...');
    let gradeCount = 0;
    for (const student of studentCodes) {
      // 每个学生每学期选4-6门课
      for (let s = 0; s < semesters.length; s++) {
        const courseCount = random.int(4, 6);
        for (let c = 0; c < courseCount; c++) {
          const offering = (s * courses.length + c) % (offeringId - 1) + 1;
          const finalScore = random.int(55, 98);
          const usualScore = random.int(60, 100);
          const midtermScore = random.int(50, 100);
          const totalScore = Math.round(finalScore * 0.6 + midtermScore * 0.2 + usualScore * 0.2);

          await connection.query(
            `INSERT INTO grades (student_id, offering_id, usual_score, midterm_score, final_score, total_score)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [student.id, offering, usualScore, midtermScore, finalScore, totalScore]
          );
          gradeCount++;
        }
      }
    }
    console.log(`✓ 插入 ${gradeCount} 条成绩记录\n`);

    // 9. 插入管理办法
    console.log('正在插入管理办法...');
    for (const reg of regulations) {
      await connection.query(
        `INSERT INTO regulations (title, category, content, version, effective_date, status, publisher)
         VALUES (?, ?, ?, ?, CURDATE(), '生效中', '教务处')`,
        [reg.title, reg.category, `这是${reg.title}的详细内容...\n\n一、总则\n二、具体规定\n三、附则`, reg.version]
      );
    }
    console.log(`✓ 插入 ${regulations.length} 个管理办法\n`);

    // 10. 插入可下载表格
    console.log('正在插入可下载表格...');
    for (const form of forms) {
      await connection.query(
        `INSERT INTO downloadable_forms (form_name, category, description, file_url, file_type, target_user, status)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [form.name, form.category, `${form.name}的说明文档`, `/uploads/${form.name}.docx`, 'docx', form.target]
      );
    }
    console.log(`✓ 插入 ${forms.length} 个可下载表格\n`);

    // 统计信息
    const stats = {};
    stats.colleges = (await connection.query('SELECT COUNT(*) as c FROM colleges'))[0][0].c;
    stats.majors = (await connection.query('SELECT COUNT(*) as c FROM majors'))[0][0].c;
    stats.classes = (await connection.query('SELECT COUNT(*) as c FROM classes'))[0][0].c;
    stats.students = (await connection.query('SELECT COUNT(*) as c FROM students'))[0][0].c;
    stats.teachers = (await connection.query('SELECT COUNT(*) as c FROM teachers'))[0][0].c;
    stats.courses = (await connection.query('SELECT COUNT(*) as c FROM courses'))[0][0].c;
    stats.grades = (await connection.query('SELECT COUNT(*) as c FROM grades'))[0][0].c;

    console.log('========================================');
    console.log('  测试数据生成完成！');
    console.log('========================================');
    console.log(`  学院：${stats.colleges} 个`);
    console.log(`  专业：${stats.majors} 个`);
    console.log(`  班级：${stats.classes} 个`);
    console.log(`  学生：${stats.students} 人`);
    console.log(`  教师：${stats.teachers} 人`);
    console.log(`  课程：${stats.courses} 门`);
    console.log(`  成绩：${stats.grades} 条`);
    console.log('========================================');
    console.log('\n默认登录账号：');
    console.log('  学生：S230101001 ~ S240630030');
    console.log('  教师：T01001 ~ T05100');
    console.log('  管理员：admin / admin123');
    console.log('  默认密码：123456');
    console.log('\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ 测试数据生成失败！');
    console.error('错误信息：', error.message);
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

generateTestData();
