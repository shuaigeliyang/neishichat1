# 真实表单模板数据库设计

**设计师：** 内师智能体系统 (￣▽￣)ﾉ
**创建时间：** 2026-04-03
**目的：** 基于真实Word文档重新设计表单模板数据结构

---

## 📊 现状分析

### 当前问题
1. **硬编码生成**：表单通过代码硬编码生成，无法灵活修改
2. **数据不一致**：数据库中的13个表单与真实的32个文档不匹配
3. **维护困难**：新增表单需要修改代码

### 真实文档统计
- **项目总数**：16个
- **文档总数**：32个
- **文档类型**：全部为.docx格式
- **表格分布**：每个文档包含1-2个表格

---

## 🗄️ 数据库表结构设计

### 1. 扩展 `form_templates` 表

```sql
CREATE TABLE form_templates (
    template_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '模板ID',
    template_name VARCHAR(200) NOT NULL COMMENT '模板名称',
    category VARCHAR(50) NOT NULL COMMENT '分类',
    project_name VARCHAR(100) NOT NULL COMMENT '所属项目',
    description TEXT COMMENT '模板说明',

    -- 文件信息
    file_path VARCHAR(500) NOT NULL COMMENT '真实文档路径',
    file_type VARCHAR(20) DEFAULT 'docx' COMMENT '文件类型',
    file_size BIGINT COMMENT '文件大小（字节）',
    table_count INT DEFAULT 1 COMMENT '文档中表格数量',

    -- 表单配置
    form_type ENUM('申请表', '审批表', '考核表', '汇总表', '规划表', '认定表', '标准表', '协议书', '同意书', '其他') DEFAULT '申请表' COMMENT '表单类型',
    target_audience ENUM('全体学生', '全体教师', '管理员', '全体用户') DEFAULT '全体学生' COMMENT '适用对象',

    -- 自动填充配置
    auto_fill_enabled TINYINT DEFAULT 1 COMMENT '是否启用自动填充',
    auto_fill_fields JSON COMMENT '可自动填充的字段映射',

    -- 状态管理
    status TINYINT DEFAULT 1 COMMENT '状态：1-可用，0-不可用',
    sort_order INT DEFAULT 0 COMMENT '排序序号',

    -- 元数据
    created_by INT COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_category (category),
    INDEX idx_project (project_name),
    INDEX idx_target_audience (target_audience),
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表单模板表（基于真实文档）';
```

### 2. 新建 `form_fields` 表（可选，用于详细字段定义）

```sql
CREATE TABLE form_fields (
    field_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '字段ID',
    template_id INT NOT NULL COMMENT '所属模板ID',
    field_name VARCHAR(100) NOT NULL COMMENT '字段名称',
    field_label VARCHAR(200) COMMENT '字段显示标签',
    field_type ENUM('text', 'number', 'date', 'select', 'textarea', 'checkbox', 'radio') DEFAULT 'text' COMMENT '字段类型',
    is_required TINYINT DEFAULT 0 COMMENT '是否必填',
    default_value VARCHAR(500) COMMENT '默认值',
    auto_fill_source VARCHAR(100) COMMENT '自动填充来源字段（如：student.name）',
    validation_rules JSON COMMENT '验证规则',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    FOREIGN KEY (template_id) REFERENCES form_templates(template_id) ON DELETE CASCADE,
    INDEX idx_template (template_id),
    INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表单字段定义表';
```

---

## 📁 文件组织结构

### 真实文档路径映射

```
内江师范学院相关信息附件/
├── "第二课堂成绩单"实施办法/
│   ├── 内江师范学院学生素质活动与德育实践补修申请表.docx
│   ├── 内江师范学院学生素质活动与德育实践补修考核表.docx
│   ├── 内江师范学院学生素质活动与德育实践认定学期汇总表.docx
│   ├── 内江师范学院素质活动与德育实践体系表.docx
│   ├── 内江师范学院素质活动与德育实践单项活动认定表.docx
│   ├── 内江师范学院素质活动与德育实践项目申报表.docx
│   ├── 内江师范学院素质活动与德育实践项目规划表.docx
│   └── 内江师范学院素质活动与德育实践（"第二课堂成绩单"）考核认定表.docx
├── 出国（境）研修奖学金管理/
│   └── 内江师范学院学生出国（境）研修奖学金申请审批表.docx
├── 学位申请管理/
│   └── 内江师范学院学士学位申请表.docx
├── 学分认定管理/
│   └── 内江师范学院非课程类成果学分（成绩）认定参考标准docx.docx
├── 家庭经济困难学生认定管理/
│   └── 内江师范学院家庭经济困难学生认定申请表.docx
├── 提前毕业管理/
│   └── 内江师范学院本科生标准学制内提前毕业申请审批表.docx
├── 校外住宿管理/
│   ├── 内江师范学院学生校外住宿协议书.docx
│   ├── 内江师范学院学生校外住宿家长同意书.docx
│   └── 内江师范学院学生校外住宿申请表.docx
├── 校级奖学金评定/
│   └── 内江师范学院学生奖学金评定方法.docx
├── 毕业论文基本规范管理/
│   ├── 内江师范学院本科毕业论文评价标准(艺术类).docx
│   ├── 内江师范学院本科毕业论文评价标准（文、史、法、经、管、教育类）.docx
│   └── 内江师范学院本科毕业论文评价标准（理工类）.docx
├── 竞赛管理/
│   ├── 一类学科竞赛学分认定标准.docx
│   ├── 内江师范学院大学生学科竞赛项目参赛计划表.docx
│   ├── 内江师范学院学科竞赛项目总结表.docx
│   └── 大学生学科竞赛经费预算表.docx
├── 结业生返校重修管理/
│   └── 结业生返校重修申请表.docx
├── 考核与成绩记载/
│   └── 考核成绩与课程绩点折算表.docx
├── 课程免修管理/
│   └── 内江师范学院课程免修申请表.docx
├── 转专业管理/
│   └── 内江师范学院学生转专业审批表.docx
├── 转学管理/
│   ├── 四川省普通高等学校学生转学备案表（省内专用）.docx
│   └── 四川省普通高等学校学生转学备案表（跨省专用）.docx
└── 违纪处分实施方法/
    ├── 内江师范学院学生违纪处分呈批表.docx
    └── 内江师范学院学生违纪处分解除申请表.docx
```

---

## 🔄 数据迁移策略

### 阶段1：备份数据
```sql
-- 备份现有表单模板数据
CREATE TABLE form_templates_backup AS SELECT * FROM form_templates;
```

### 阶段2：更新表结构
```sql
-- 添加新字段
ALTER TABLE form_templates
ADD COLUMN project_name VARCHAR(100) NOT NULL AFTER description,
ADD COLUMN table_count INT DEFAULT 1 AFTER file_size,
ADD COLUMN form_type VARCHAR(50) DEFAULT '申请表' AFTER file_type,
ADD COLUMN auto_fill_enabled TINYINT DEFAULT 1 AFTER target_audience,
ADD COLUMN auto_fill_fields JSON AFTER auto_fill_enabled;

-- 更新文件路径格式
UPDATE form_templates
SET file_path = CONCAT('../内江师范学院相关信息附件/', project_name, '/', template_name, '.docx');
```

### 阶段3：插入真实文档数据
```sql
-- 清空现有数据
TRUNCATE TABLE form_templates;

-- 插入32个真实文档（见下文完整SQL脚本）
```

---

## 📋 32个真实文档清单

### 按项目分类

| 项目 | 文档数量 | 文档列表 |
|------|---------|---------|
| "第二课堂成绩单"实施办法 | 8 | 补修申请表、补修考核表、认定学期汇总表、体系表、单项活动认定表、项目申报表、项目规划表、考核认定表 |
| 出国（境）研修奖学金管理 | 1 | 申请审批表 |
| 学位申请管理 | 1 | 学士学位申请表 |
| 学分认定管理 | 1 | 认定参考标准 |
| 家庭经济困难学生认定管理 | 1 | 认定申请表 |
| 提前毕业管理 | 1 | 提前毕业申请审批表 |
| 校外住宿管理 | 3 | 协议书、家长同意书、申请表 |
| 校级奖学金评定 | 1 | 奖学金评定方法 |
| 毕业论文基本规范管理 | 3 | 评价标准（艺术类、文史法经管教育类、理工类） |
| 竞赛管理 | 4 | 学分认定标准、参赛计划表、项目总结表、经费预算表 |
| 结业生返校重修管理 | 1 | 重修申请表 |
| 考核与成绩记载 | 1 | 成绩与课程绩点折算表 |
| 课程免修管理 | 1 | 课程免修申请表 |
| 转专业管理 | 1 | 转专业审批表 |
| 转学管理 | 2 | 转学备案表（省内、跨省） |
| 违纪处分实施方法 | 2 | 违纪处分呈批表、处分解除申请表 |

---

## 🎯 下一步行动

1. ✅ 分析真实Word文档 - **已完成**
2. 🔄 设计数据库结构 - **进行中**
3. ⏳ 创建数据迁移SQL脚本
4. ⏳ 开发表单模板读取服务
5. ⏳ 重构表单生成逻辑
6. ⏳ 测试所有32个表单

---

**备注：** 本设计确保表单生成完全基于真实文档，不再使用硬编码方式。
