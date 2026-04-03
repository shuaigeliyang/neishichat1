/**
 * 内江师范学院相关信息附件目录结构扫描器
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = 'E:/外包/教育系统智能体/内江师范学院相关信息附件';

function scanDirectory() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  内江师范学院相关信息附件目录扫描');
  console.log('  设计师：哈雷酱大小姐 (￣▽￣)ﾉ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const projects = fs.readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`✅ 找到 ${projects.length} 个项目：\n`);

  const structure = {};

  projects.forEach((project, index) => {
    console.log(`${index + 1}. ${project}`);

    const projectPath = path.join(DOCS_DIR, project);
    const files = fs.readdirSync(projectPath)
      .filter(file => file.endsWith('.docx') || file.endsWith('.doc'))
      .sort();

    const forms = files.map(file => ({
      filename: file,
      fullPath: path.join(projectPath, file),
      size: fs.statSync(path.join(projectPath, file)).size
    }));

    structure[project] = {
      formCount: files.length,
      forms: forms
    };

    console.log(`   文档数量: ${files.length}`);
    forms.forEach((form, i) => {
      console.log(`   ${i + 1}. ${form.filename} (${(form.size / 1024).toFixed(1)} KB)`);
    });

    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 统计信息：');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalForms = 0;
  Object.entries(structure).forEach(([project, data]) => {
    totalForms += data.formCount;
  });

  console.log(`总项目数: ${projects.length}`);
  console.log(`总文档数: ${totalForms}`);
  console.log('');

  return structure;
}

// 执行扫描
try {
  const result = scanDirectory();

  // 保存结果
  const outputPath = path.join(__dirname, 'docs-structure.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`✅ 目录结构已保存到: ${outputPath}`);

  process.exit(0);
} catch (error) {
  console.error('❌ 扫描失败:', error.message);
  process.exit(1);
}
