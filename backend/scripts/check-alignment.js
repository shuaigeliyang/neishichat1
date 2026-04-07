/**
 * 检查数据库与实际目录的对齐情况
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */
const { query } = require('../src/config/database');
const fs = require('fs');

async function checkAlignment() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  检查数据库与实际目录对齐情况');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 读取数据库中的表单
    const forms = await query(`
      SELECT template_id, template_name, project_name, category
      FROM form_templates
      ORDER BY project_name, sort_order
    `);

    console.log('📊 数据库中的表单（按项目分组）:\n');

    let currentProject = '';
    const dbProjects = {};

    forms.forEach(f => {
      if (!dbProjects[f.project_name]) {
        dbProjects[f.project_name] = [];
      }
      dbProjects[f.project_name].push(f.template_name);

      if (f.project_name !== currentProject) {
        currentProject = f.project_name;
        console.log('【' + currentProject + '】');
      }
      console.log('  ' + f.template_name);
    });

    // 2. 读取实际目录
    const actualDirs = fs.readdirSync('E:/外包/教育系统智能体/内江师范学院相关信息附件')
      .filter(d => {
        const fullPath = 'E:/外包/教育系统智能体/内江师范学院相关信息附件/' + d;
        return fs.statSync(fullPath).isDirectory();
      })
      .sort();

    console.log('\n📁 实际目录中的项目:\n');
    const actualProjects = {};

    actualDirs.forEach(dir => {
      console.log('【' + dir + '】');

      const files = fs.readdirSync('E:/外包/教育系统智能体/内江师范学院相关信息附件/' + dir)
        .filter(f => f.endsWith('.docx') || f.endsWith('.doc'))
        .sort();

      actualProjects[dir] = files;

      files.forEach(f => {
        const nameWithoutExt = f.replace(/\.(docx|doc)$/, '');
        console.log('  ' + nameWithoutExt);
      });
    });

    // 3. 对比分析
    console.log('\n🔍 对比分析:\n');

    const dbProjectNames = Object.keys(dbProjects).sort();
    const actualProjectNames = Object.keys(actualProjects).sort();

    console.log('数据库项目数:', dbProjectNames.length);
    console.log('实际项目数:', actualProjectNames.length);

    console.log('\n✅ 数据库有但实际目录没有的项目:');
    dbProjectNames.filter(p => !actualProjectNames.includes(p)).forEach(p => {
      console.log('  -', p);
    });

    console.log('\n❌ 实际目录有但数据库没有的项目:');
    actualProjectNames.filter(p => !dbProjectNames.includes(p)).forEach(p => {
      console.log('  -', p);
    });

    console.log('\n⚠️  项目名称不完全匹配的:');
    dbProjectNames.forEach(dbp => {
      const match = actualProjectNames.find(ap => ap === dbp);
      if (!match) {
        // 尝试模糊匹配
        const normalize = (str) => str.replace(/[\""\(\)（）]/g, '');
        const fuzzy = actualProjectNames.find(ap => normalize(ap) === normalize(dbp));
        if (fuzzy) {
          console.log('  数据库: "' + dbp + '"');
          console.log('  实际: "' + fuzzy + '"');
        }
      }
    });

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAlignment();
