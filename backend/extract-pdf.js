/**
 * PDF文档提取和降噪脚本
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：从PDF提取文本并进行多级降噪处理
 */

const fs = require('fs');
const path = require('path');

// 尝试加载PDF解析库
let PDFParse;
try {
    const pdfModule = require('pdf-parse');
    PDFParse = pdfModule.PDFParse;
} catch (e) {
    console.error('请先安装pdf-parse: npm install pdf-parse');
    process.exit(1);
}

console.log('='.repeat(60));
console.log('🚀 PDF文档提取和降噪');
console.log('='.repeat(60));

// ============================================================
// 降噪规则定义
// ============================================================

/**
 * 噪音模式列表 - 按优先级排序
 * 越靠前的规则优先级越高
 */
const NOISE_PATTERNS = [
    // 1. 纯标点符号行（最高优先级）
    { regex: /^[，。、；：""''（）【】《》!?.,;:'"()[\]\s\-—…·]+$/g, action: 'remove', name: '纯标点行' },

    // 2. 页码标记
    { regex: /^[—\-]\s*\d+\s*[—\-]$/g, action: 'remove', name: '页码标记' },
    { regex: /^\d+\s*[—\-]\s*\d+$/g, action: 'remove', name: '页码范围' },

    // 3. 空行和空白
    { regex: /^\s*$/g, action: 'remove', name: '空行' },
    { regex: /^\s+$/g, action: 'remove', name: '纯空白' },

    // 4. 单字符或太短的行（可能是噪音）
    { regex: /^[a-zA-Z0-9\s]{1,3}$/g, action: 'remove', name: '过短字符' },

    // 5. PDF提取常见的噪音模式
    { regex: /^[·•●○]\s*$/g, action: 'remove', name: '孤立项目符号' },
    { regex: /^\.\.\.+$/g, action: 'remove', name: '省略号' },
    { regex: /^\s*[|｜]\s*$/g, action: 'remove', name: '竖线' },

    // 6. URL和邮箱
    { regex: /https?:\/\/[^\s]+/g, action: 'remove', name: 'URL' },
    { regex: /\w+@\w+\.\w+/g, action: 'remove', name: '邮箱' },

    // 7. 连续重复字符（超过3个）
    { regex: /(.)\1{3,}/g, action: 'remove', name: '连续重复' },

    // 8. 只包含数字和标点的行
    { regex: /^[0-9\s,。、;：:.。]+$/g, action: 'remove', name: '数字标点行' },
];

/**
 * 文本修复规则
 */
const FIX_PATTERNS = [
    // 1. 修复PDF空格问题
    { from: /([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, to: '$1$2', name: '合并中文空格' },
    { from: /(\d)\s+(分|元|人|门|次|年|月|日|号|页|条|款|名|期|岁|%)/g, to: '$1$2', name: '合并数字单位' },
    { from: /([a-zA-Z])\s+([a-zA-Z])/g, to: '$1$2', name: '合并英文单词' },

    // 2. 修复标点问题
    { from: /\s+([，,。、;；:：!！?？])/g, to: '$1', name: '标点前空格' },
    { from: /([，,。、;；:：!！?？])\s+/g, to: '$1', name: '标点后空格' },
    { from: /\(\s+/g, to: '(', name: '左括号空格' },
    { from: /\s+\)/g, to: ')', name: '右括号空格' },

    // 3. 修复引号问题
    { from: /《\s+/g, to: '《', name: '书名号前空格' },
    { from: /\s+》/g, to: '》', name: '书名号后空格' },
    { from: /"\s+/g, to: '"', name: '引号空格' },

    // 4. 修复数字格式
    { from: /第\s+(一|二|三|四|五|六|七|八|九|十|百|千|万|亿)/g, to: '第$1', name: '章节序号' },
];

/**
 * 判断是否为有效内容行
 */
function isValidContent(text) {
    // 太短的肯定不是有效内容
    if (text.length < 3) return false;

    // 统计中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

    // 中文占比超过30%认为是有效内容
    if (chineseChars / text.length < 0.3) {
        return false;
    }

    // 包含有效关键词的
    const keywords = ['规定', '学生', '学校', '课程', '考试', '成绩', '学分', '毕业', '学位', '奖惩', '管理', '申请', '办法', '条件', '程序', '时间', '地点', '标准', '要求', '原则', '制度', '纪律', '行为', '教学', '教师', '辅导员', '专业', '学年', '学期', '选课', '重修', '补考', '不及格', '奖学金', '助学金', '贷款', '宿舍', '请假', '休学', '复学', '退学', '转专业', '补修', '缓考', '作弊', '违规', '处分', '警告', '记过', '开除'];

    for (const keyword of keywords) {
        if (text.includes(keyword)) {
            return true;
        }
    }

    // 包含阿拉伯数字开头的条款（如 "第一条"、"第十条"）
    if (/^[第十零一二三四五六七八九十百千万亿0-9]+条/.test(text)) {
        return true;
    }

    // 包含中文数字开头的编号
    if (/^[一二三四五六七八九十]+[、.．]/.test(text)) {
        return true;
    }

    // 包含括号内的条款编号
    if (/\([一二三四五六七八九十0-9]+\)/.test(text)) {
        return true;
    }

    return false;
}

/**
 * 降噪处理一行文本
 */
function denoiseLine(line) {
    let text = line.trim();
    if (!text) return '';

    // 应用所有降噪规则
    for (const pattern of NOISE_PATTERNS) {
        const before = text;
        text = text.replace(pattern.regex, '');
        if (before !== text) {
            return ''; // 如果匹配了噪音规则，直接删除整行
        }
    }

    return text;
}

/**
 * 修复文本格式
 */
function fixText(text) {
    let fixed = text;

    // 多次迭代应用修复规则，直到没有变化
    let iterations = 0;
    let previous = '';

    while (previous !== fixed && iterations < 10) {
        previous = fixed;
        for (const pattern of FIX_PATTERNS) {
            fixed = fixed.replace(pattern.from, pattern.to);
        }
        iterations++;
    }

    return fixed;
}

/**
 * 提取PDF文本
 */
async function extractPDF(pdfPath) {
    console.log('\n📄 加载PDF文件...');
    const dataBuffer = fs.readFileSync(pdfPath);

    console.log('📖 解析PDF内容...');
    const parser = new PDFParse();
    const data = await parser.loadPDF(dataBuffer);

    console.log(`✓ PDF解析完成！`);
    console.log(`  - 总页数：${data.numpages}`);
    console.log(`  - 原始文本长度：${data.text?.length || 0} 字符`);

    return {
        pages: data.numpages,
        text: data.text || '',
        info: data.info
    };
}

/**
 * 处理PDF文本，提取有效内容
 */
function processPDFText(pdfData) {
    console.log('\n🔧 开始文本处理和降噪...');

    const lines = pdfData.text.split('\n');
    const processedLines = [];

    let removedCount = 0;
    let keptCount = 0;

    for (const line of lines) {
        const original = line;

        // 1. 降噪
        const denoised = denoiseLine(line);
        if (!denoised) {
            removedCount++;
            continue;
        }

        // 2. 修复格式
        const fixed = fixText(denoised);

        // 3. 检查是否为有效内容
        if (!isValidContent(fixed)) {
            removedCount++;
            continue;
        }

        // 4. 长度检查
        if (fixed.length < 5) {
            removedCount++;
            continue;
        }

        keptCount++;
        processedLines.push({
            original: original.trim(),
            cleaned: fixed,
            length: fixed.length
        });
    }

    console.log(`✓ 降噪处理完成！`);
    console.log(`  - 保留行数：${keptCount}`);
    console.log(`  - 移除行数：${removedCount}`);
    console.log(`  - 保留率：${(keptCount / (keptCount + removedCount) * 100).toFixed(1)}%`);

    return processedLines;
}

/**
 * 按页分割处理后的文本
 */
function splitByPage(processedLines, totalPages) {
    console.log('\n📑 按页分割文本...');

    // 估算每页的行数
    const avgLinesPerPage = processedLines.length / totalPages;

    const pages = [];

    for (let i = 0; i < totalPages; i++) {
        const startLine = Math.floor(i * avgLinesPerPage);
        const endLine = Math.floor((i + 1) * avgLinesPerPage);

        const pageLines = processedLines.slice(startLine, endLine);

        pages.push({
            page_num: i + 1,
            lines: pageLines,
            text: pageLines.map(l => l.cleaned).join('\n')
        });
    }

    console.log(`✓ 已分割为${pages.length}页`);

    return pages;
}

/**
 * 生成文档块
 */
function generateChunks(pages) {
    console.log('\n📦 生成文档块...');

    const chunks = [];
    let chunkId = 0;

    let currentChapter = '未分类';
    let currentSection = '';

    for (const page of pages) {
        for (const line of page.lines) {
            const text = line.cleaned;

            // 检测章节标题
            if (text.length < 50 && text.length > 2) {
                // 以"第X章"开头的
                if (/^第[一二三四五六七八九十百千]+章/.test(text)) {
                    currentChapter = text;
                    currentSection = '';
                    chunks.push({
                        id: ++chunkId,
                        text: text,
                        page_number: page.page_num,
                        chapter_title: text,
                        section_title: '',
                        chunk_type: 'chapter'
                    });
                    continue;
                }

                // 以"第X节"开头的
                if (/^第[一二三四五六七八九十百千]+节/.test(text)) {
                    currentSection = text;
                    chunks.push({
                        id: ++chunkId,
                        text: text,
                        page_number: page.page_num,
                        chapter_title: currentChapter,
                        section_title: text,
                        chunk_type: 'section'
                    });
                    continue;
                }

                // 包含"办法"、"规定"、"制度"、"细则"、"条例"等法规名称的短行
                if (text.includes('办法') || text.includes('规定') || text.includes('制度') ||
                    text.includes('细则') || text.includes('条例') || text.includes('规范')) {
                    // 可能是标题
                    if (/^[^\(（]/.test(text) && !/[)）]$/.test(text)) {
                        currentChapter = text;
                        currentSection = '';
                        chunks.push({
                            id: ++chunkId,
                            text: text,
                            page_number: page.page_num,
                            chapter_title: text,
                            section_title: '',
                            chunk_type: 'title'
                        });
                        continue;
                    }
                }
            }

            // 普通内容行
            chunks.push({
                id: ++chunkId,
                text: text,
                page_number: page.page_num,
                chapter_title: currentChapter,
                section_title: currentSection,
                chunk_type: 'content'
            });
        }
    }

    console.log(`✓ 生成${chunks.length}个文档块`);

    // 统计
    const typeStats = {};
    chunks.forEach(c => {
        typeStats[c.chunk_type] = (typeStats[c.chunk_type] || 0) + 1;
    });
    console.log('\n📊 文档块类型统计：');
    Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
    });

    return chunks;
}

/**
 * 添加上下文窗口
 */
function addContextWindow(chunks, windowSize = 2) {
    console.log('\n🔗 添加上下文窗口...');

    const result = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // 获取前后的上下文
        const beforeChunks = chunks.slice(Math.max(0, i - windowSize), i);
        const afterChunks = chunks.slice(i + 1, Math.min(chunks.length, i + windowSize + 1));

        // 构建上下文文本
        const beforeText = beforeChunks.map(c => c.text).join(' ');
        const afterText = afterChunks.map(c => c.text).join(' ');

        result.push({
            ...chunk,
            context_before: beforeText,
            context_after: afterText,
            full_context: `${beforeText} ${chunk.text} ${afterText}`.trim()
        });
    }

    console.log(`✓ 上下文窗口添加完成`);

    return result;
}

/**
 * 移除重复块
 */
function deduplicateChunks(chunks) {
    console.log('\n🔄 移除重复块...');

    const seen = new Set();
    const unique = [];

    for (const chunk of chunks) {
        // 使用前50个字符作为去重键
        const key = chunk.text.substring(0, 50);

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(chunk);
        }
    }

    console.log(`✓ 去重完成：${chunks.length} → ${unique.length}（移除${chunks.length - unique.length}个重复）`);

    return unique;
}

// ============================================================
// 主函数
// ============================================================

async function main() {
    const pdfPath = path.join(__dirname, '../相关文档/2025年本科学生手册-定 (1).pdf');

    // 1. 提取PDF
    const pdfData = await extractPDF(pdfPath);

    // 2. 处理和降噪
    const processedLines = processPDFText(pdfData);

    // 3. 按页分割
    const pages = splitByPage(processedLines, pdfData.pages);

    // 4. 生成文档块
    let chunks = generateChunks(pages);

    // 5. 去重
    chunks = deduplicateChunks(chunks);

    // 6. 添加上下文窗口
    chunks = addContextWindow(chunks);

    // 7. 保存结果
    const outputPath = path.join(__dirname, '../document_chunks_from_pdf.json');
    fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2), 'utf-8');
    console.log(`\n✓ 文档块已保存到：${outputPath}`);
    console.log(`  - 文件大小：${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

    // 8. 显示样例
    console.log('\n📋 样例文档块（前5个）：');
    chunks.slice(0, 5).forEach((chunk, i) => {
        console.log(`\n${i + 1}. [${chunk.chapter_title}] 第${chunk.page_number}页`);
        console.log(`   类型：${chunk.chunk_type}`);
        console.log(`   内容：${chunk.text.substring(0, 100)}...`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ PDF提取和降噪完成！');
    console.log('='.repeat(60));
}

main().catch(error => {
    console.error('\n❌ 处理失败：', error);
    process.exit(1);
});
