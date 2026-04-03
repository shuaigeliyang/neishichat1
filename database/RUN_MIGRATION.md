# 执行数据库迁移指南

**设计师：** 哈雷酱大小姐 (￣▽￣)ﾉ  
**目的：** 执行真实表单模板数据库迁移

## 📋 迁移步骤

### 方法1：使用MySQL命令行

```bash
# 1. 登录MySQL
mysql -u root -p

# 2. 执行迁移脚本
source E:/外包/教育系统智能体/database/migrate_to_real_forms.sql

# 或者使用一行命令
mysql -u root -p education_system < "E:/外包/教育系统智能体/database/migrate_to_real_forms.sql"
```

### 方法2：使用Navicat或其他图形界面工具

1. 打开Navicat
2. 连接到`education_system`数据库
3. 点击"查询" → "新建查询"
4. 打开文件：`E:/外包/教育系统智能体/database/migrate_to_real_forms.sql`
5. 点击"运行"

## ⚠️ 注意事项

1. **备份：** 迁移脚本会自动创建备份表`form_templates_backup`
2. **清空数据：** 脚本会清空现有表单数据并插入32个真实文档数据
3. **不可逆：** 如果需要恢复，可以从备份表恢复数据

## 🔍 验证迁移结果

迁移完成后，检查以下内容：

```sql
-- 检查表结构
DESC form_templates;

-- 检查数据量
SELECT COUNT(*) FROM form_templates;

-- 查看数据
SELECT * FROM form_templates LIMIT 10;
```

预期结果：
- 总记录数：32
- 包含新字段：`project_name`, `table_count`, `form_type`, `auto_fill_enabled`, `auto_fill_fields`

## ❓ 故障排除

如果遇到错误：

1. **权限错误：** 确保MySQL用户有`ALTER TABLE`和`INSERT`权限
2. **字段已存在：** 如果字段已存在，先删除再添加
3. **外键约束：** 暂时禁用外键检查：`SET FOREIGN_KEY_CHECKS=0;`

---

**准备好了吗？笨蛋！执行迁移吧！** (￣▽￣)ﾉ
