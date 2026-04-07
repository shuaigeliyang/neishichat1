/**
 * 创建表单模板表的脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 */

require('dotenv').config();
const { query } = require('../src/config/database');

async function createFormTemplatesTable() {
  try {
    console.log('🚀 开始创建表单模板表...\n');

    // 创建表
    await query(`
      CREATE TABLE IF NOT EXISTS form_templates (
        template_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '模板ID',
        template_name VARCHAR(200) NOT NULL COMMENT '模板名称',
        category VARCHAR(50) NOT NULL COMMENT '分类（申请表/证明表/其他）',
        description TEXT COMMENT '模板说明',
        file_path VARCHAR(255) NOT NULL COMMENT '文件路径',
        file_type VARCHAR(20) DEFAULT 'docx' COMMENT '文件类型',
        file_size BIGINT COMMENT '文件大小（字节）',
        download_count INT DEFAULT 0 COMMENT '下载次数',
        target_audience ENUM('全体学生', '全体教师', '管理员', '全体用户') DEFAULT '全体学生' COMMENT '适用对象',
        status TINYINT DEFAULT 1 COMMENT '状态：1-可用，0-不可用',
        sort_order INT DEFAULT 0 COMMENT '排序序号',
        created_by INT COMMENT '创建人ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_category (category),
        INDEX idx_target_audience (target_audience),
        INDEX idx_status (status),
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表单模板表'
    `);

    console.log('✅ 表单模板表创建成功！\n');

    // 插入初始数据
    console.log('📝 插入初始表单数据...\n');

    const templates = [
      { name: '学科竞赛参赛申请表', category: '申请表', desc: '用于各类学科竞赛的参赛申请', sort: 1 },
      { name: '转专业申请表', category: '申请表', desc: '用于学生转专业的正式申请', sort: 2 },
      { name: '奖学金申请表', category: '申请表', desc: '用于各类奖学金的申请', sort: 3 },
      { name: '休学申请表', category: '申请表', desc: '用于学生申请休学', sort: 4 },
      { name: '复学申请表', category: '申请表', desc: '用于学生申请复学', sort: 5 },
      { name: '成绩证明申请表', category: '证明表', desc: '用于申请开具成绩证明', sort: 6 },
      { name: '在读证明申请表', category: '证明表', desc: '用于申请开具在读证明', sort: 7 },
      { name: '毕业证明申请表', category: '证明表', desc: '用于申请开具毕业证明', sort: 8 }
    ];

    for (const template of templates) {
      await query(`
        INSERT INTO form_templates (template_name, category, description, file_path, target_audience, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        template.name,
        template.category,
        template.desc,
        `/forms/${template.name}.docx`,
        '全体学生',
        template.sort
      ]);
      console.log(`✅ 插入表单模板：${template.name}`);
    }

    console.log('\n🎉 所有表单模板插入完成！\n');

    // 验证结果
    const result = await query(`
      SELECT template_id, template_name, category, target_audience, sort_order
      FROM form_templates
      ORDER BY sort_order
    `);

    console.log('📋 当前表单模板列表：');
    console.table(result);

    console.log('\n✨ 表单模板表创建完成！');

    process.exit(0);

  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    process.exit(1);
  }
}

// 执行创建
createFormTemplatesTable();
