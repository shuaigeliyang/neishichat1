/**
 * 真实Word文档分析工具
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 * 功能：读取并分析内江师范学院相关信息附件中的所有Word文档
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const JSZip = require('jszip');

// 项目配置
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DOCS_DIR = path.join(PROJECT_ROOT, '内江师范学院相关信息附件');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'backend/exports/analysis');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 获取所有项目目录
 */
function getProjectDirectories() {
  const projects = fs.readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`✅ 找到 ${projects.length} 个项目目录：`);
  projects.forEach((project, index) => {
    console.log(`   ${index + 1}. ${project}`);
  });

  return projects;
}

/**
 * 获取项目中的所有Word文档
 */
function getWordDocuments(projectDir) {
  const projectPath = path.join(DOCS_DIR, projectDir);
  const files = fs.readdirSync(projectPath)
    .filter(file => file.endsWith('.docx') || file.endsWith('.doc'));

  return files.map(file => ({
    filename: file,
    fullPath: path.join(projectPath, file),
    projectName: projectDir
  }));
}

/**
 * 提取Word文档信息（使用mammoth）
 */
async function extractDocInfo(docPath) {
  try {
    // 读取文档文本内容
    const result = await mammoth.extractRawText({ path: docPath });
    const text = result.value;

    // 提取段落（前20段）
    const paragraphs = text
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .slice(0, 20);

    // 尝试提取表格（从ZIP中读取document.xml）
    const tables = await extractTablesFromDocx(docPath);

    return {
      text: text.substring(0, 500), // 前500字符
      paragraphs: paragraphs,
      tableCount: tables.length,
      tables: tables
    };

  } catch (error) {
    console.error(`   ❌ 提取失败: ${error.message}`);
    return null;
  }
}

/**
 * 从docx文件中提取表格
 */
async function extractTablesFromDocx(docPath) {
  try {
    const data = fs.readFileSync(docPath);
    const zip = await JSZip.loadAsync(data);

    // 读取document.xml
    const documentXml = await zip.file('word/document.xml').async('string');

    // 简单统计表格数量（<w:tbl>标签）
    const tableMatches = documentXml.match(/<w:tbl>/g);
    const tableCount = tableMatches ? tableMatches.length : 0;

    // 提取表格基本信息
    const tables = [];
    for (let i = 0; i < tableCount; i++) {
      tables.push({
        index: i,
        hasTable: true,
        note: '表格结构需要进一步解析'
      });
    }

    return tables;

  } catch (error) {
    console.error(`   提取表格失败: ${error.message}`);
    return [];
  }
}

/**
 * 分析所有文档
 */
async function analyzeAllDocuments() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  真实Word文档分析工具');
  console.log('  设计师：哈雷酱大小姐 (￣▽￣)ﾉ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 获取所有项目
  const projects = getProjectDirectories();
  const allDocs = [];

  // 遍历每个项目
  for (const project of projects) {
    console.log(`\n📁 处理项目: ${project}`);

    const docs = getWordDocuments(project);
    console.log(`   找到 ${docs.length} 个文档`);

    for (const doc of docs) {
      console.log(`   📄 分析: ${doc.filename}`);

      const info = await extractDocInfo(doc.fullPath);

      if (info) {
        allDocs.push({
          projectName: project,
          filename: doc.filename,
          filePath: doc.fullPath,
          tableCount: info.tableCount || 0,
          textPreview: info.text || '',
          paragraphs: info.paragraphs || [],
          tables: info.tables || []
        });

        console.log(`      ✅ 表格数量: ${info.tableCount || 0}`);
      } else {
        console.log(`      ❌ 分析失败`);
      }
    }
  }

  // 保存分析结果
  const outputPath = path.join(OUTPUT_DIR, 'docs-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(allDocs, null, 2), 'utf-8');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 分析完成！');
  console.log(`📊 总计分析: ${allDocs.length} 个文档`);
  console.log(`📁 结果保存: ${outputPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 生成统计报告
  generateReport(allDocs);

  return allDocs;
}

/**
 * 生成统计报告
 */
function generateReport(docs) {
  const reportPath = path.join(OUTPUT_DIR, 'analysis-report.txt');
  let report = '';

  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '  真实Word文档分析报告\n';
  report += '  设计师：哈雷酱大小姐 (￣▽￣)ﾉ\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // 按项目分组
  const byProject = {};
  docs.forEach(doc => {
    if (!byProject[doc.projectName]) {
      byProject[doc.projectName] = [];
    }
    byProject[doc.projectName].push(doc);
  });

  report += `📊 项目统计：\n`;
  report += `   总项目数: ${Object.keys(byProject).length}\n`;
  report += `   总文档数: ${docs.length}\n\n`;

  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '📁 各项目详情：\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  Object.entries(byProject).forEach(([project, projectDocs]) => {
    report += `【${project}】\n`;
    report += `   文档数量: ${projectDocs.length}\n`;

    projectDocs.forEach(doc => {
      report += `   - ${doc.filename}\n`;
      report += `     表格数量: ${doc.tableCount}\n`;
      if (doc.tables.length > 0) {
        doc.tables.forEach((table, idx) => {
          report += `     表格${idx + 1}: ${table.rows}行 x ${table.columns}列\n`;
        });
      }
    });

    report += '\n';
  });

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 报告保存: ${reportPath}`);
}

// 运行分析
(async () => {
  try {
    await analyzeAllDocuments();
  } catch (err) {
    console.error('❌ 分析失败:', err);
    process.exit(1);
  }
})();
