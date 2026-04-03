/**
 * 使用实际文件夹名完全对齐数据库
 * 设计师：哈雷酱大小姐 (￣▽￣)ﾉ
 */
const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

const DOCS_DIR = 'E:/外包/教育系统智能体/内江师范学院相关信息附件';

async function fixAlignment() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  使用实际文件夹名对齐数据库');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 读取所有实际项目文件夹名
    const actualProjects = fs.readdirSync(DOCS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort();

    console.log(`✅ 找到 ${actualProjects.length} 个实际项目文件夹`);

    // 读取数据库中的所有表单
    const forms = await query('SELECT template_id, template_name, project_name, file_path FROM form_templates ORDER BY sort_order');
    console.log(`✅ 数据库中有 ${forms.length} 个表单模板\n`);

    // 为每个表单查找对应的项目文件夹
    for (const form of forms) {
      // 尝试从file_path中提取项目名
      const pathMatch = form.file_path.match(/内江师范学院相关信息附件\/(.+?)\//);
      if (!pathMatch) {
        console.log(`⚠️  无法提取项目名: ${form.template_name}`);
        console.log(`   file_path: ${form.file_path}`);
        continue;
      }

      const oldProjectName = pathMatch[1];

      // 在实际文件夹列表中查找匹配的项目
      // 使用模糊匹配，因为可能有引号、括号等特殊字符
      let actualProjectName = null;

      // 1. 精确匹配
      if (actualProjects.includes(oldProjectName)) {
        actualProjectName = oldProjectName;
      }

      // 2. 模糊匹配（去除特殊字符后匹配）
      if (!actualProjectName) {
        const normalize = (str) => str.replace(/[\""\(\)（）]/g, '');
        const normalizedOld = normalize(oldProjectName);

        for (const actual of actualProjects) {
          if (normalize(actual) === normalizedOld) {
            actualProjectName = actual;
            break;
          }
        }
      }

      // 3. 关键词匹配
      if (!actualProjectName) {
        const keywords = oldProjectName.replace(/[\""\(\)（）]/g, '').split('');
        for (const actual of actualProjects) {
          const normalizedActual = actual.replace(/[\""\(\)（）]/g, '');
          if (keywords.every(kw => normalizedActual.includes(kw))) {
            actualProjectName = actual;
            break;
          }
        }
      }

      if (actualProjectName) {
        // 更新数据库记录
        const newFilePath = `../内江师范学院相关信息附件/${actualProjectName}/${form.template_name}.docx`;

        await query(
          'UPDATE form_templates SET project_name = ?, file_path = ? WHERE template_id = ?',
          [actualProjectName, newFilePath, form.template_id]
        );

        console.log(`✅ [${form.template_id}] ${form.template_name}`);
        console.log(`   项目名: ${actualProjectName}`);
      } else {
        console.log(`❌ [${form.template_id}] ${form.template_name}`);
        console.log(`   无法找到匹配的项目文件夹: ${oldProjectName}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 对齐完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 验证结果
    const verify = await query('SELECT project_name, COUNT(*) as count FROM form_templates GROUP BY project_name ORDER BY project_name');
    console.log('📊 验证结果：');
    verify.forEach(v => {
      console.log(`   ${v.project_name}: ${v.count} 个表单`);
    });

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 对齐失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAlignment();
