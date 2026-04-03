-- 修复表单名称中的引号问题
-- 设计师：哈雷酱大小姐 (￣▽￣)ﾉ

-- 修复"第二课堂成绩单"相关表单的名称（添加缺失的中文全角引号）
UPDATE form_templates
SET template_name = '内江师范学院素质活动与德育实践（"第二课堂成绩单"）考核认定表'
WHERE template_name = '内江师范学院素质活动与德育实践（第二课堂成绩单）考核认定表';

-- 验证修复结果
SELECT
  template_id,
  template_name,
  project_name,
  CASE
    WHEN template_name LIKE '%("第二课堂成绩单")%' THEN '✅ 已修复'
    ELSE '❌ 需要检查'
  END AS status
FROM form_templates
WHERE template_name LIKE '%第二课堂成绩单%'
  AND template_name LIKE '%考核认定表%';
