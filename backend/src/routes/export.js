/**
 * 导出下载路由
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/auth');
const { success, error } = require('../utils/response');
const { query } = require('../config/database');
const {
  exportStudentProfile,
  exportClassStudents,
  exportCollegeStudents,
  exportStudentGrades
} = require('../services/exportExcel');
const ExcelJS = require('exceljs');

/**
 * 导出学生个人信息
 * GET /api/export/student/profile
 */
router.get('/student/profile', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'student') {
      return error(res, '只有学生才能导出个人信息', 403);
    }

    const buffer = await exportStudentProfile(userId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_profile.xlsx');
    res.send(buffer);

  } catch (err) {
    console.error('导出个人信息错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

/**
 * 导出学生成绩
 * GET /api/export/student/grades
 */
router.get('/student/grades', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    if (userType !== 'student') {
      return error(res, '只有学生才能导出成绩', 403);
    }

    const buffer = await exportStudentGrades(userId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_grades.xlsx');
    res.send(buffer);

  } catch (err) {
    console.error('导出成绩错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

/**
 * 导出班级学生信息
 * GET /api/export/class/:classId
 */
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { id: userId, type: userType } = req.user;

    // 验证权限：教师可以导出所教班级，学生可以导出自己的班级
    if (userType === 'student') {
      // 学生只能导出自己所在班级
      const { query } = require('../config/database');
      const student = await query('SELECT class_id FROM students WHERE student_id = ?', [userId]);
      if (student.length === 0 || student[0].class_id != classId) {
        return error(res, '无权导出其他班级的信息', 403);
      }
    }

    const buffer = await exportClassStudents(classId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=class_students.xlsx');
    res.send(buffer);

  } catch (err) {
    console.error('导出班级信息错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

/**
 * 导出学院学生信息
 * GET /api/export/college/:collegeId
 */
router.get('/college/:collegeId', authenticate, async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { id: userId, type: userType } = req.user;

    // 验证权限：教师可以导出所在学院，学生可以导出自己的学院
    if (userType === 'student') {
      const { query } = require('../config/database');
      const student = await query(`
        SELECT m.college_id
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.class_id
        LEFT JOIN majors m ON c.major_id = m.major_id
        WHERE s.student_id = ?
      `, [userId]);
      if (student.length === 0 || student[0].college_id != collegeId) {
        return error(res, '无权导出其他学院的信息', 403);
      }
    }

    const buffer = await exportCollegeStudents(collegeId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=college_students.xlsx');
    res.send(buffer);

  } catch (err) {
    console.error('导出学院信息错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

/**
 * 管理员导出所有学院信息
 * GET /api/export/admin/colleges
 */
router.get('/admin/colleges', authenticate, authorize('管理员'), async (req, res) => {
  try {
    console.log('📊 管理员导出所有学院信息...');

    const colleges = await query(`
      SELECT
        college_id AS '学院ID',
        college_name AS '学院名称',
        college_code AS '学院代码',
        dean_name AS '院长姓名',
        phone AS '联系电话',
        email AS '邮箱',
        address AS '地址',
        website AS '网站',
        established_date AS '成立日期',
        description AS '学院简介'
      FROM colleges
      ORDER BY college_id
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('学院信息');

    worksheet.columns = [
      { header: '学院ID', key: 'college_id', width: 15 },
      { header: '学院名称', key: 'college_name', width: 30 },
      { header: '学院代码', key: 'college_code', width: 15 },
      { header: '院长姓名', key: 'dean_name', width: 15 },
      { header: '联系电话', key: 'phone', width: 20 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '地址', key: 'address', width: 30 },
      { header: '网站', key: 'website', width: 25 },
      { header: '成立日期', key: 'established_date', width: 15 },
      { header: '学院简介', key: 'description', width: 40 }
    ];

    worksheet.addRows(colleges);

    // 添加样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=colleges_info.xlsx');
    res.send(buffer);

    console.log('✅ 学院信息导出成功，共', colleges.length, '条记录');

  } catch (err) {
    console.error('❌ 导出学院信息错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

/**
 * 管理员导出所有学生信息
 * GET /api/export/admin/students
 */
router.get('/admin/students', authenticate, authorize('管理员'), async (req, res) => {
  try {
    console.log('📊 管理员导出所有学生信息...');

    const students = await query(`
      SELECT
        s.student_id AS '学生ID',
        s.student_code AS '学号',
        s.name AS '姓名',
        s.gender AS '性别',
        s.birth_date AS '出生日期',
        s.phone AS '联系电话',
        s.email AS '邮箱',
        s.address AS '家庭住址',
        s.enrollment_date AS '入学日期',
        s.status AS '状态',
        c.class_name AS '班级名称',
        m.major_name AS '专业名称',
        col.college_name AS '学院名称'
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
      ORDER BY s.student_id
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('学生信息');

    worksheet.columns = [
      { header: '学生ID', key: 'student_id', width: 15 },
      { header: '学号', key: 'student_code', width: 15 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '性别', key: 'gender', width: 10 },
      { header: '出生日期', key: 'birth_date', width: 15 },
      { header: '联系电话', key: 'phone', width: 20 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '家庭住址', key: 'address', width: 30 },
      { header: '入学日期', key: 'enrollment_date', width: 15 },
      { header: '状态', key: 'status', width: 10 },
      { header: '班级名称', key: 'class_name', width: 20 },
      { header: '专业名称', key: 'major_name', width: 25 },
      { header: '学院名称', key: 'college_name', width: 25 }
    ];

    worksheet.addRows(students);

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=all_students.xlsx');
    res.send(buffer);

    console.log('✅ 学生信息导出成功，共', students.length, '条记录');

  } catch (err) {
    console.error('❌ 导出学生信息错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

/**
 * 教师导出授课班级信息
 * GET /api/export/teacher/classes
 */
router.get('/teacher/classes', authenticate, async (req, res) => {
  try {
    const { id: userId, type: userType } = req.user;

    // 只有教师才能导出授课班级
    if (userType !== 'teacher') {
      return error(res, '只有教师才能导出授课班级信息', 403);
    }

    console.log('📊 教师导出授课班级信息...', { teacherId: userId });

    const classes = await query(`
      SELECT
        c.class_id AS '班级ID',
        c.class_name AS '班级名称',
        m.major_name AS '专业名称',
        m.major_code AS '专业代码',
        col.college_name AS '学院名称',
        col.college_code AS '学院代码',
        COUNT(DISTINCT co.course_id) AS '授课门数',
        GROUP_CONCAT(DISTINCT course.course_name SEPARATOR '、') AS '授课课程'
      FROM course_offerings co
      LEFT JOIN classes c ON co.class_id = c.class_id
      LEFT JOIN majors m ON c.major_id = m.major_id
      LEFT JOIN colleges col ON m.college_id = col.college_id
      LEFT JOIN courses course ON co.course_id = course.course_id
      WHERE co.teacher_id = ?
        AND co.status = 1
      GROUP BY co.class_id, c.class_name, m.major_name, m.major_code, col.college_name, col.college_code
      ORDER BY c.class_name
    `, [userId]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('授课班级信息');

    worksheet.columns = [
      { header: '班级ID', key: 'class_id', width: 12 },
      { header: '班级名称', key: 'class_name', width: 35 },
      { header: '专业名称', key: 'major_name', width: 30 },
      { header: '专业代码', key: 'major_code', width: 15 },
      { header: '学院名称', key: 'college_name', width: 30 },
      { header: '学院代码', key: 'college_code', width: 15 },
      { header: '授课门数', key: 'course_count', width: 12 },
      { header: '授课课程', key: 'courses', width: 50 }
    ];

    worksheet.addRows(classes);

    // 添加样式
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 自动调整列宽
    worksheet.columns.forEach(column => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=teaching_classes.xlsx');
    res.send(buffer);

    console.log('✅ 授课班级信息导出成功，共', classes.length, '个班级');

  } catch (err) {
    console.error('❌ 导出授课班级信息错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

/**
 * 管理员导出所有教师信息
 * GET /api/export/admin/teachers
 */
router.get('/admin/teachers', authenticate, authorize('管理员'), async (req, res) => {
  try {
    console.log('📊 管理员导出所有教师信息...');

    const teachers = await query(`
      SELECT
        t.teacher_id AS '教师ID',
        t.teacher_code AS '工号',
        t.name AS '姓名',
        t.gender AS '性别',
        t.birth_date AS '出生日期',
        t.phone AS '联系电话',
        t.email AS '邮箱',
        t.hire_date AS '入职日期',
        t.status AS '状态',
        t.title AS '职称',
        c.college_name AS '学院名称'
      FROM teachers t
      LEFT JOIN colleges c ON t.college_id = c.college_id
      ORDER BY t.teacher_id
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('教师信息');

    worksheet.columns = [
      { header: '教师ID', key: 'teacher_id', width: 15 },
      { header: '工号', key: 'teacher_code', width: 15 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '性别', key: 'gender', width: 10 },
      { header: '出生日期', key: 'birth_date', width: 15 },
      { header: '联系电话', key: 'phone', width: 20 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '入职日期', key: 'hire_date', width: 15 },
      { header: '状态', key: 'status', width: 10 },
      { header: '职称', key: 'title', width: 15 },
      { header: '学院名称', key: 'college_name', width: 25 }
    ];

    worksheet.addRows(teachers);

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=all_teachers.xlsx');
    res.send(buffer);

    console.log('✅ 教师信息导出成功，共', teachers.length, '条记录');

  } catch (err) {
    console.error('❌ 导出教师信息错误:', err);
    error(res, '导出失败：' + err.message, 500);
  }
});

module.exports = router;
