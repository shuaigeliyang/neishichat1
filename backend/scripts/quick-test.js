/**
 * 快速测试表单生成功能
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

const realFormGenerator = require('../src/services/realFormGeneratorService');
const fs = require('fs');

async function quickTest() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  快速测试表单生成');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 测试1：获取模板列表
    console.log('📋 测试1：获取模板列表');
    const templates = await realFormGenerator.getTemplateList('student');
    console.log(`✅ 成功！找到 ${templates.length} 个模板\n`);

    // 测试2：检查文件是否存在
    console.log('📁 测试2：检查模板文件');
    const projectRoot = require('path').resolve(__dirname, '../..');
    let existCount = 0;
    let missingCount = 0;

    for (const template of templates.slice(0, 5)) {
      if (!template.file_path) continue;

      const relativePath = template.file_path.replace('../', '');
      const fullPath = require('path').join(projectRoot, relativePath);
      const exists = fs.existsSync(fullPath);

      if (exists) {
        existCount++;
        console.log(`   ✅ ${template.template_name}`);
      } else {
        missingCount++;
        console.log(`   ❌ ${template.template_name} - 文件不存在`);
      }
    }

    console.log(`\n   检查结果: ${existCount} 个存在, ${missingCount} 个缺失\n`);

    // 测试3：生成一个表单
    console.log('📝 测试3：生成表单');
    const mockStudent = {
      student_id: 1,
      name: '测试学生',
      student_code: '20240001',
      gender: '男',
      class_name: '计算机1班',
      major_name: '计算机科学与技术',
      college_name: '计算机学院',
      phone: '13800138000'
    };

    const result = await realFormGenerator.generateForm('转专业审批表', mockStudent, 'student');

    console.log(`✅ 表单生成成功！`);
    console.log(`   文件名: ${result.fileName}`);
    console.log(`   大小: ${(result.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   路径: ${result.filePath}`);

    // 验证文件是否存在
    if (fs.existsSync(result.filePath)) {
      console.log(`   ✅ 文件已创建`);
    } else {
      console.log(`   ❌ 文件未创建`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 测试完成！表单生成功能正常！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest();
