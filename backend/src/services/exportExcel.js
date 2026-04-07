/**
 * Excel导出服务
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const ExcelJS = require('exceljs');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 导出学生个人信息Excel
 * @param {number} studentId - 学生ID
 * @returns {Promise<Buffer>}
 */
async function exportStudentProfile(studentId) {
  try {
    logger.info('开始导出学生个人信息', { studentId });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('个人信息');

    // 查询学生信息（只查询实际存在的字段）
    const students = await query(`
      SELECT
        s.student_code AS '学号',
        s.name AS '姓名',
        s.gender AS '性别',
        s.phone AS '联系电话',
        s.email AS '邮箱',
        s.enrollment_date AS '入学日期',
        s.status AS '学籍状态',
        c.class_name AS '班级',
        m.major_name AS '专业',
        col.college_name AS '学院'
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
      WHERE s.student_id = ?
    `, [studentId]);

    if (students.length === 0) {
      throw new Error('学生信息不存在');
    }

    const student = students[0];
    logger.info('查询到学生信息', { studentCode: student['学号'] });

    // 设置列
    worksheet.columns = [
      { header: '项目', key: 'field', width: 20 },
      { header: '内容', key: 'value', width: 40 }
    ];

    // 添加数据
    Object.keys(student).forEach(key => {
      worksheet.addRow({
        field: key,
        value: student[key] || ''
      });
    });

    // 设置标题样式
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 生成buffer
    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('Excel文件生成成功', { size: buffer.length });
    return buffer;
  } catch (error) {
    logger.error('导出学生个人信息失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 导出班级学生信息Excel
 * @param {number} classId - 班级ID
 * @returns {Promise<Buffer>}
 */
async function exportClassStudents(classId) {
  try {
    logger.info('开始导出班级学生信息', { classId });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('班级学生');

    // 查询班级学生信息（只查询实际存在的字段）
    const students = await query(`
      SELECT
        s.student_code AS '学号',
        s.name AS '姓名',
        s.gender AS '性别',
        s.phone AS '联系电话',
        s.email AS '邮箱',
        s.status AS '学籍状态'
      FROM students s
      WHERE s.class_id = ? AND s.status = '在读'
      ORDER BY s.student_code
    `, [classId]);

    // 查询班级信息
    const classInfo = await query(`
      SELECT c.class_name, m.major_name, col.college_name
      FROM classes c
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
      WHERE c.class_id = ?
    `, [classId]);

    logger.info('查询到班级学生信息', { count: students.length, classId });

    // 设置列
    const columns = [
      { header: '学号', key: '学号', width: 15 },
      { header: '姓名', key: '姓名', width: 15 },
      { header: '性别', key: '性别', width: 10 },
      { header: '联系电话', key: '联系电话', width: 15 },
      { header: '邮箱', key: '邮箱', width: 25 },
      { header: '宿舍', key: '宿舍', width: 12 },
      { header: '学籍状态', key: '学籍状态', width: 12 }
    ];

    worksheet.columns = columns;

    // 添加标题行
    worksheet.addRow(['班级：' + (classInfo[0]?.class_name || ''), '', '', '', '', '', '', '']);
    worksheet.addRow(['专业：' + (classInfo[0]?.major_name || ''), '', '', '', '', '', '', '']);
    worksheet.addRow(['学院：' + (classInfo[0]?.college_name || ''), '', '', '', '', '', '', '']);
    worksheet.addRow([]);

    // 添加表头
    const headerRow = worksheet.addRow(columns.map(c => c.header));
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 添加数据
    students.forEach(student => {
      worksheet.addRow(student);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('班级Excel文件生成成功', { size: buffer.length });
    return buffer;
  } catch (error) {
    logger.error('导出班级学生信息失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 导出学院学生信息Excel
 * @param {number} collegeId - 学院ID
 * @returns {Promise<Buffer>}
 */
async function exportCollegeStudents(collegeId) {
  try {
    logger.info('开始导出学院学生信息', { collegeId });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('学院学生');

    // 查询学院学生信息（只查询实际存在的字段）
    const students = await query(`
      SELECT
        s.student_code AS '学号',
        s.name AS '姓名',
        s.gender AS '性别',
        c.class_name AS '班级',
        m.major_name AS '专业',
        s.phone AS '联系电话',
        s.email AS '邮箱',
        s.status AS '学籍状态'
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
      WHERE col.college_id = ? AND s.status = '在读'
      ORDER BY m.major_name, c.class_name, s.student_code
    `, [collegeId]);

    // 查询学院信息
    const collegeInfo = await query('SELECT college_name FROM colleges WHERE college_id = ?', [collegeId]);

    logger.info('查询到学院学生信息', { count: students.length, collegeId });

    // 设置列
    const columns = [
      { header: '学号', key: '学号', width: 15 },
      { header: '姓名', key: '姓名', width: 15 },
      { header: '性别', key: '性别', width: 10 },
      { header: '班级', key: '班级', width: 20 },
      { header: '专业', key: '专业', width: 20 },
      { header: '联系电话', key: '联系电话', width: 15 },
      { header: '邮箱', key: '邮箱', width: 25 },
      { header: '宿舍', key: '宿舍', width: 12 },
      { header: '学籍状态', key: '学籍状态', width: 12 }
    ];

    worksheet.columns = columns;

    // 添加标题
    worksheet.addRow(['学院：' + (collegeInfo[0]?.college_name || ''), '', '', '', '', '', '', '', '']);
    worksheet.addRow([]);

    // 添加表头
    const headerRow = worksheet.addRow(columns.map(c => c.header));
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 添加数据
    students.forEach(student => {
      worksheet.addRow(student);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('学院Excel文件生成成功', { size: buffer.length });
    return buffer;
  } catch (error) {
    logger.error('导出学院学生信息失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 导出学生成绩Excel
 * @param {number} studentId - 学生ID
 * @returns {Promise<Buffer>}
 */
async function exportStudentGrades(studentId) {
  try {
    logger.info('开始导出学生成绩', { studentId });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('成绩单');

    // 查询学生成绩
    const grades = await query(`
      SELECT
        c.course_name AS '课程名称',
        c.course_code AS '课程代码',
        c.credits AS '学分',
        c.course_type AS '课程类型',
        co.semester AS '学期',
        g.usual_score AS '平时成绩',
        g.midterm_score AS '期中成绩',
        g.final_score AS '期末成绩',
        g.total_score AS '总评成绩',
        t.name AS '授课教师'
      FROM grades g
      LEFT JOIN course_offerings co ON g.offering_id = co.offering_id
      LEFT JOIN courses c ON co.course_id = c.course_id
      LEFT JOIN teachers t ON co.teacher_id = t.teacher_id
      WHERE g.student_id = ?
      ORDER BY co.semester DESC, c.course_code
    `, [studentId]);

    // 查询学生信息
    const studentInfo = await query(`
      SELECT s.name, s.student_code, c.class_name, m.major_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      WHERE s.student_id = ?
    `, [studentId]);

    if (studentInfo.length === 0) {
      throw new Error('学生信息不存在');
    }

    const student = studentInfo[0];
    logger.info('查询到成绩信息', { count: grades.length, studentCode: student.student_code });

    // 设置列
    const columns = [
      { header: '课程名称', key: '课程名称', width: 25 },
      { header: '课程代码', key: '课程代码', width: 15 },
      { header: '学分', key: '学分', width: 10 },
      { header: '课程类型', key: '课程类型', width: 15 },
      { header: '学期', key: '学期', width: 15 },
      { header: '平时成绩', key: '平时成绩', width: 12 },
      { header: '期中成绩', key: '期中成绩', width: 12 },
      { header: '期末成绩', key: '期末成绩', width: 12 },
      { header: '总评成绩', key: '总评成绩', width: 12 },
      { header: '授课教师', key: '授课教师', width: 15 }
    ];

    worksheet.columns = columns;

    // 添加标题
    worksheet.addRow(['学生成绩单', '', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['姓名：' + student?.name || '', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['学号：' + student?.student_code || '', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['班级：' + student?.class_name || '', '', '', '', '', '', '', '', '']);
    worksheet.addRow(['专业：' + student?.major_name || '', '', '', '', '', '', '', '', '']);
    worksheet.addRow([]);

    // 添加表头
    const headerRow = worksheet.addRow(columns.map(c => c.header));
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 添加数据
    grades.forEach(grade => {
      worksheet.addRow(grade);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info('成绩Excel文件生成成功', { size: buffer.length });
    return buffer;
  } catch (error) {
    logger.error('导出学生成绩失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = {
  exportStudentProfile,
  exportClassStudents,
  exportCollegeStudents,
  exportStudentGrades
};
