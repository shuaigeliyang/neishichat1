/**
 * 真实表单功能测试脚本
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 * 功能：测试基于真实文档的表单生成功能
 */

const realFormGenerator = require('../src/services/realFormGeneratorService');
const fs = require('fs');
const path = require('path');

/**
 * 测试1：获取所有模板
 */
async function testGetAllTemplates() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 测试1：获取所有模板');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const templates = await realFormGenerator.getTemplateList('student');

    console.log(`✅ 成功获取 ${templates.length} 个模板\n`);

    // 显示前10个
    templates.slice(0, 10).forEach((template, index) => {
      console.log(`${index + 1}. ${template.template_name}`);
      console.log(`   项目: ${template.project_name}`);
      console.log(`   分类: ${template.category}`);
      console.log(`   路径: ${template.file_path}`);
      console.log('');
    });

    if (templates.length > 10) {
      console.log(`... 还有 ${templates.length - 10} 个模板\n`);
    }

    return templates;

  } catch (error) {
    console.error('❌ 获取模板失败:', error.message);
    return [];
  }
}

/**
 * 测试2：按项目分组获取模板
 */
async function testGetTemplatesByProject() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 测试2：按项目分组获取模板');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const grouped = await realFormGenerator.getTemplatesByProject('student');

    console.log(`✅ 成功获取 ${Object.keys(grouped).length} 个项目的模板\n`);

    Object.entries(grouped).forEach(([project, templates]) => {
      console.log(`【${project}】`);
      console.log(`   文档数量: ${templates.length}`);
      templates.forEach(t => {
        console.log(`   - ${t.template_name}`);
      });
      console.log('');
    });

    return grouped;

  } catch (error) {
    console.error('❌ 按项目获取模板失败:', error.message);
    return {};
  }
}

/**
 * 测试3：搜索模板
 */
async function testSearchTemplates() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 测试3：搜索模板');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const keywords = ['转专业', '奖学金', '申请表'];

  for (const keyword of keywords) {
    try {
      console.log(`搜索关键词: "${keyword}"`);
      const results = await realFormGenerator.searchTemplates(keyword, 'student');

      console.log(`✅ 找到 ${results.length} 个结果`);
      results.forEach(result => {
        console.log(`   - ${result.template_name} (${result.project_name})`);
      });
      console.log('');

    } catch (error) {
      console.error(`❌ 搜索"${keyword}"失败:`, error.message);
    }
  }
}

/**
 * 测试4：检查模板文件是否存在
 */
async function testTemplateFilesExist(templates) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📁 测试4：检查模板文件是否存在');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const projectRoot = path.resolve(__dirname, '../..');
  let existCount = 0;
  let missingCount = 0;
  const missingFiles = [];

  templates.forEach(template => {
    if (!template.file_path) {
      missingCount++;
      missingFiles.push({
        template: template.template_name,
        path: '未定义路径'
      });
      return;
    }

    const relativePath = template.file_path.replace('../', '');
    const fullPath = path.join(projectRoot, relativePath);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      existCount++;
    } else {
      missingCount++;
      missingFiles.push({
        template: template.template_name,
        path: fullPath
      });
    }
  });

  console.log(`✅ 文件存在: ${existCount} 个`);
  console.log(`❌ 文件缺失: ${missingCount} 个`);

  if (missingFiles.length > 0) {
    console.log('\n缺失的文件：');
    missingFiles.forEach(file => {
      console.log(`   - ${file.template}`);
      console.log(`     路径: ${file.path}`);
    });
  }

  console.log('');
}

/**
 * 测试5：生成表单（模拟）
 */
async function testGenerateForm() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 测试5：生成表单（模拟）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 模拟学生信息
  const mockStudent = {
    student_id: 1,
    name: '测试学生',
    student_code: '20240001',
    gender: '男',
    class_name: '计算机科学与技术1班',
    major_name: '计算机科学与技术',
    college_name: '计算机科学学院',
    phone: '13800138000',
    email: 'test@example.com'
  };

  // 测试生成几个表单
  const testTemplates = ['转专业审批表', '奖学金评定方法', '违纪处分解除申请表'];

  for (const templateName of testTemplates) {
    try {
      console.log(`生成表单: "${templateName}"`);
      const result = await realFormGenerator.generateForm(templateName, mockStudent, 'student');

      console.log(`✅ 生成成功!`);
      console.log(`   文件名: ${result.fileName}`);
      console.log(`   大小: ${(result.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   下载URL: ${result.downloadUrl}`);
      console.log('');

    } catch (error) {
      console.error(`❌ 生成"${templateName}"失败:`, error.message);
      console.log('');
    }
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  真实表单功能测试');
  console.log('  设计师：哈雷酱大小姐 (￣▽￣)ﾉ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 测试1：获取所有模板
    const templates = await testGetAllTemplates();

    // 测试2：按项目分组
    await testGetTemplatesByProject();

    // 测试3：搜索模板
    await testSearchTemplates();

    // 测试4：检查文件存在
    if (templates && templates.length > 0) {
      await testTemplateFilesExist(templates);
    }

    // 测试5：生成表单
    await testGenerateForm();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 所有测试完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
runAllTests();
