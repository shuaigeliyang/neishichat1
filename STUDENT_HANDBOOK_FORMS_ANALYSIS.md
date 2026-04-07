# 学生手册表单需求分析

> 作者：内师智能体系统 (￣▽￣)ﾉ
> 创建日期：2026-03-30
> 分析目的：确定学生手册中提及的表单是否需要全部实现

---

## 📋 学生手册中提及的管理办法（对应表单需求）

根据本小姐对学生手册JSON文件的分析，发现学生手册中确实提到了很多管理办法，这些管理办法都需要学生填写相应的申请表！

### ✅ 已实现的表单（4个）

| 表单名称 | 学生手册对应内容 | 实现状态 |
|---------|----------------|---------|
| 学科竞赛参赛申请表 | 《内江师范学院学科竞赛管理办法》 | ✅ 已实现 |
| 转专业申请表 | 《内江师范学院普通全日制本科生转专业管理办法》 | ✅ 已实现 |
| 奖学金申请表 | 《内江师范学院学生奖学金评定办法》 | ✅ 已实现 |
| 休学申请表 | 《普通高等学校学生管理规定》- 休学与复学章节 | ✅ 已实现 |

### ❌ 未实现但学生手册有提及的表单（17个）

#### 申请表类（10个）

| 表单名称 | 学生手册对应内容 | 紧急程度 |
|---------|----------------|---------|
| **复学申请表** | 《普通高等学校学生管理规定》- 第二十九条 | 🔴 高 |
| **请假申请表** | 《内江师范学院学生学习规范》- 请假制度 | 🔴 高 |
| **缓考申请表** | 《内江师范学院学生考试违规处理办法》 | 🟡 中 |
| **重修申请表** | 《内江师范学院课程重修管理办法（试行）》 | 🟡 中 |
| **辅修申请表** | 《内江师范学院学分认定管理办法（修订）》 | 🟡 中 |
| **交换生申请表** | 《内江师范学院学生出国（境）研修奖学金评选办法》 | 🟢 低 |
| **调宿申请表** | 《内江师范学院学生公寓管理办法》 | 🟡 中 |
| **贫困生认定申请表** | 《内江师范学院家庭经济困难学生认定工作管理办法》 | 🔴 高 |
| **助学金申请表** | 《内江师范学院国家奖助学金评审办法》 | 🔴 高 |
| **助学贷款申请表** | 《内江师范学院生源地信用助学贷款管理办法》 | 🔴 高 |
| **优秀学生申请表** | 《内江师范学院学生荣誉称号评定办法》 | 🟡 中 |
| **优秀毕业生申请表** | 《内江师范学院学生荣誉称号评定办法》 | 🟡 中 |

#### 证明表类（5个）

| 表单名称 | 学生手册对应内容 | 紧急程度 |
|---------|----------------|---------|
| **成绩证明申请表** | 第三十四条 - 学业证书管理 | 🔴 高 |
| **在读证明申请表** | 第三十四条 - 学业证书管理 | 🔴 高 |
| **毕业证明申请表** | 第三十三条 - 结业/毕业证书 | 🔴 高 |
| **学位证明申请表** | 第三十三条 - 学位证书 | 🔴 高 |
| **预毕业证明申请表** | 第三十三条 - 预毕业相关 | 🟡 中 |

#### 其他（1个）

| 表单名称 | 学生手册对应内容 | 紧急程度 |
|---------|----------------|---------|
| **离校手续单** | 第三十一条 - 退学手续 | 🟡 中 |

---

## 🎯 结论

**是的，这些表单在学生手册中都有提及！**

虽然学生手册中没有直接说"下载XX申请表"，但是每一条管理办法都隐含了学生需要填写相应申请表的需求：

**例如：**
- 学生手册说"学生可以申请休学" → 需要**休学申请表**（已实现）
- 学生手册说"学生可以申请复学" → 需要**复学申请表**（未实现❌）
- 学生手册说"家庭经济困难学生认定" → 需要**贫困生认定申请表**（未实现❌）
- 学生手册说"申请国家助学金" → 需要**助学金申请表**（未实现❌）

---

## 💡 建议方案

### 方案1：分阶段实现（推荐！）

**第一阶段：高优先级表单（9个）- 紧急需求**
这些是学生日常最常需要的服务：

1. 复学申请表 - 休学后返校必须
2. 请假申请表 - 学生日常请假
3. 贫困生认定申请表 - 助学金申请前提
4. 助学金申请表 - 国家助学金申请
5. 助学贷款申请表 - 生源地助学贷款
6. 成绩证明申请表 - 求职/升学必需
7. 在读证明申请表 - 各种证明需求
8. 毕业证明申请表 - 学历证明
9. 学位证明申请表 - 学位证明

**第二阶段：中优先级表单（7个）**
这些是特定场景需要：

1. 缓考申请表
2. 重修申请表
3. 辅修申请表
4. 调宿申请表
5. 优秀学生申请表
6. 优秀毕业生申请表
7. 预毕业证明申请表
8. 离校手续单

**第三阶段：低优先级表单（1个）**
1. 交换生申请表

### 方案2：快速实现 - 通用表单模板

创建一个通用的表单生成方法，可以快速生成所有表单的基础版本。

**优点：**
- 快速上线所有表单
- 用户可以立即下载使用

**缺点：**
- 格式可能不够美观
- 字段可能不够完整

**作为过渡方案非常合适！**

---

## 📝 通用表单模板示例

```javascript
/**
 * 生成通用申请表
 * @param {Object} studentInfo - 学生信息
 * @param {string} formName - 表单名称
 * @param {string} formDescription - 表单说明
 */
async generateGenericForm(studentInfo, formName, formDescription) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 标题
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: formName,
              bold: true,
              size: 32
            })
          ]
        }),
        new Paragraph({ text: '' }),

        // 说明
        new Paragraph({
          children: [
            new TextRun({
              text: '说明：',
              bold: true
            }),
            new TextRun(formDescription)
          ]
        }),
        new Paragraph({ text: '' }),

        // 学生基本信息
        new Paragraph({
          children: [
            new TextRun({
              text: '学生基本信息',
              bold: true,
              underline: {}
            })
          ]
        }),
        new Paragraph({ text: '' }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('姓名')] }),
                new TableCell({ children: [new Paragraph(studentInfo.name || '')] }),
                new TableCell({ children: [new Paragraph('学号')] }),
                new TableCell({ children: [new Paragraph(studentInfo.student_code || '')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('学院')] }),
                new TableCell({ children: [new Paragraph(studentInfo.college_name || '')] }),
                new TableCell({ children: [new Paragraph('专业')] }),
                new TableCell({ children: [new Paragraph(studentInfo.major_name || '')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('班级')] }),
                new TableCell({ children: [new Paragraph(studentInfo.class_name || '')] }),
                new TableCell({ children: [new Paragraph('联系电话')] }),
                new TableCell({ children: [new Paragraph(studentInfo.phone || '')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('申请日期')] }),
                new TableCell({
                  columnSpan: 3,
                  children: [new Paragraph('____年____月____日')]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('申请理由')] }),
                new TableCell({
                  columnSpan: 3,
                  children: [new Paragraph('')]
                })
              ]
            })
          ]
        }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),

        // 审批意见
        new Paragraph({
          children: [
            new TextRun({
              text: '审批意见',
              bold: true,
              underline: {}
            })
          ]
        }),
        new Paragraph({ text: '' }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('辅导员意见：\n\n签字：__________    日期：__________')] }),
                new TableCell({ children: [new Paragraph('学院意见：\n\n签字：__________    日期：__________')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('主管部门意见：\n\n签字：__________    日期：__________')] }),
                new TableCell({ children: [new Paragraph('学校意见：\n\n签字：__________    日期：__________')] })
              ]
            })
          ]
        })
      ]
    }]
  });

  return await this.saveDocument(doc, formName, studentInfo.name);
}
```

---

## 🚀 快速实施方案

### 步骤1：添加通用表单生成方法

在 `backend/src/services/formGeneratorService.js` 中添加上面的 `generateGenericForm` 方法。

### 步骤2：修改后端路由

在 `backend/src/routes/forms.js` 中修改表单生成逻辑：

```javascript
// 根据模板类型生成不同的表单
let result;
const finalTemplateName = template[0].template_name;

if (finalTemplateName.includes('竞赛')) {
  result = await formGenerator.generateCompetitionForm(studentInfo[0]);
} else if (finalTemplateName.includes('转专业')) {
  result = await formGenerator.generateTransferForm(studentInfo[0]);
} else if (finalTemplateName.includes('奖学金')) {
  result = await formGenerator.generateScholarshipForm(studentInfo[0]);
} else if (finalTemplateName.includes('休学')) {
  result = await formGenerator.generateSuspensionForm(studentInfo[0]);
} else {
  // 其他表单使用通用模板
  console.log('📝 使用通用模板生成表单:', finalTemplateName);
  result = await formGenerator.generateGenericForm(
    studentInfo[0],
    finalTemplateName,
    template[0].description || ''
  );
}
```

### 步骤3：恢复数据库中的所有表单

```bash
mysql -u root -p education_system < database/create_form_templates.sql
pm2 restart all
```

### 步骤4：测试验证

所有21个表单都应该能够下载了！

---

## ✨ 总结

哼，本小姐的分析结果很明确了！(￣▽￣)ﾉ

**结论：**
- ✅ 学生手册中确实提到了这些表单的相关管理办法
- ✅ 这些表单都是学生实际需要的
- ✅ 应该全部实现

**推荐方案：**
1. **立即实施通用模板方案** - 让所有表单都能下载
2. **逐步优化重点表单** - 先优化高优先级的9个表单
3. **长期完善所有表单** - 为每个表单设计专门格式

**时间估算：**
- 通用模板方案：1-2小时 ⚡
- 优化9个高优先级表单：4-6小时
- 完善所有21个表单：12-20小时

本小姐建议先实施通用模板方案，这样用户马上就能使用所有表单了！o(￣▽￣)ｄ

---

**文档版本：** 1.0
**最后更新：** 2026-03-30
**作者：** 内师智能体系统 (￣▽￣)ﾉ
