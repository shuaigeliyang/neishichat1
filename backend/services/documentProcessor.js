/**
 * 文档处理服务（修复版）
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：处理学生手册，分块、向量化、存储
 *
 * 修复内容：
 * 1. 确保所有页面都被处理
 * 2. 保留完整的段落内容
 * 3. 智能识别文档结构
 */

const fs = require('fs').promises;
const path = require('path');

class DocumentProcessor {
    constructor() {
        this.handbookData = null;
        this.chunks = [];
    }

    /**
     * 加载学生手册数据
     */
    async loadHandbook() {
        try {
            const jsonPath = path.join(__dirname, '../../student_handbook_full.json');
            const data = await fs.readFile(jsonPath, 'utf-8');
            this.handbookData = JSON.parse(data);
            console.log(`✓ 加载学生手册成功，共${this.handbookData.total_pages}页`);
            return this.handbookData;
        } catch (error) {
            console.error('✗ 加载学生手册失败：', error.message);
            throw error;
        }
    }

    /**
     * 智能分块 - 重新设计
     */
    chunkDocument() {
        if (!this.handbookData) {
            throw new Error('请先加载学生手册数据');
        }

        console.log('✓ 开始文档分块...');
        this.chunks = [];

        let chunkId = 0;
        let currentChapter = null;
        let currentSection = null;

        // 遍历每一页
        for (const page of this.handbookData.pages) {
            // 预处理：过滤掉纯标点行，这是PDF提取的主要噪音来源
            const rawLines = page.text.split('\n');
            const lines = rawLines
                .map(l => l.trim())
                .filter(line => {
                    if (!line) return false;
                    // 过滤掉只包含标点符号和空格的行（PDF提取噪音）
                    // 允许的字符：中文标点、英文标点、空格、制表符
                    if (/^[，,。、；;：:！!？?"""''（）()\s\-—…·]+$/.test(line)) {
                        return false;
                    }
                    // 过滤页码行（如 "— 45 —"）
                    if (/^—\s*\d+\s*—$/.test(line)) {
                        return false;
                    }
                    return true;
                });

            let currentParagraph = [];  // 当前段落的内容

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // 检查是否是章节标题（以一、二、三、或 第X章 开头）
                if (this.isChapterTitle(line)) {
                    // 先保存之前的段落
                    if (currentParagraph.length > 0) {
                        this.createChunkFromParagraph(currentParagraph, page.page_num, currentChapter, currentSection, ++chunkId);
                        currentParagraph = [];
                    }

                    const cleanedLine = this.cleanText(line);
                    currentChapter = cleanedLine;
                    currentSection = null;

                    // 章节标题也作为一个独立的文档块
                    this.chunks.push({
                        id: ++chunkId,
                        text: cleanedLine,
                        page_num: page.page_num,
                        chapter_title: cleanedLine,
                        section_title: '',
                        chunk_type: 'chapter_title'
                    });
                    continue;
                }

                // 检查是否是小节标题（包含"办法"、"规定"、"管理"等）
                if (this.isSectionTitle(line)) {
                    // 先保存之前的段落
                    if (currentParagraph.length > 0) {
                        this.createChunkFromParagraph(currentParagraph, page.page_num, currentChapter, currentSection, ++chunkId);
                        currentParagraph = [];
                    }

                    const cleanedLine = this.cleanText(line);
                    currentSection = cleanedLine;

                    // 小节标题也作为一个独立的文档块
                    this.chunks.push({
                        id: ++chunkId,
                        text: cleanedLine,
                        page_num: page.page_num,
                        chapter_title: currentChapter || '未分类',
                        section_title: cleanedLine,
                        chunk_type: 'section_title'
                    });
                    continue;
                }

                // 将行添加到当前段落
                currentParagraph.push(line);
            }

            // 页面结束时，保存最后一个段落
            if (currentParagraph.length > 0) {
                this.createChunkFromParagraph(currentParagraph, page.page_num, currentChapter, currentSection, ++chunkId);
            }
        }

        console.log(`✓ 分块完成，共生成${this.chunks.length}个文档块`);
        return this.chunks;
    }

    /**
     * 从段落创建文档块
     */
    createChunkFromParagraph(paragraph, pageNum, chapter, section, id) {
        const rawText = paragraph.join(' ');
        const text = this.cleanText(rawText);

        // 跳过太短的段落
        if (text.length < 5) {
            return;
        }

        this.chunks.push({
            id: id,
            text: text,
            page_num: pageNum,
            chapter_title: chapter || '未分类',
            section_title: section || '',
            chunk_type: this.identifyChunkType(text)
        });
    }

    /**
     * 清理PDF提取的文本，修复常见的格式问题
     * PDF提取产生的文本有大量标点噪音和断词问题
     */
    cleanText(text) {
        let cleaned = text;

        // 1. 移除 "条款" 前缀噪音（PDF提取产生的）
        cleaned = cleaned.replace(/条款\s*/g, '');

        // 2. 移除行内残留的独立标点符号（空格包围的标点）
        // 多次执行以处理连续标点的情况
        for (let i = 0; i < 5; i++) {
            cleaned = cleaned.replace(/\s+[，,。、；;：:！!？?]+\s*/g, '');
        }

        // 3. 修复引号相关：清理引号内的多余空格
        cleaned = cleaned.replace(/"\s+/g, '"');
        cleaned = cleaned.replace(/\s+"/g, '"');
        cleaned = cleaned.replace(/"\s*"/g, '""');
        cleaned = cleaned.replace(/《\s+/g, '《');
        cleaned = cleaned.replace(/\s+》/g, '》');
        cleaned = cleaned.replace(/（\s+/g, '（');
        cleaned = cleaned.replace(/\s+）/g, '）');

        // 4. 修复数字和单位之间的空格（"70 分" → "70分"）
        cleaned = cleaned.replace(/(\d+)\s+(分|元|人|门|次|年|月|日|号|页|条|款|名|期|岁)/g, '$1$2');

        // 5. 合并中文之间的多余空格（"学生 在校" → "学生在校"）
        // 这是PDF解析产生的主要问题，需要多次执行直到没有变化
        let previous = '';
        while (previous !== cleaned) {
            previous = cleaned;
            cleaned = cleaned.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');
        }

        // 6. 修复 "第X条" 格式
        cleaned = cleaned.replace(/第\s*(一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|二十一|二十二|二十三|二十四|二十五|二十六|二十七|二十八|二十九|三十)\s*条/g, '第$1条');

        // 7. 修复括号与内容之间的多余空格
        cleaned = cleaned.replace(/\(\s+/g, '(');
        cleaned = cleaned.replace(/\s+\)/g, ')');

        // 8. 移除中文标点前后的空格（"学生 ， 老师" → "学生，老师"）
        cleaned = cleaned.replace(/\s+([，,。、；;：:！!？?""''））])/g, '$1');
        cleaned = cleaned.replace(/([（（""''])\s+/g, '$1');

        // 9. 移除顿号前后的空格（"升 、跳" → "升、跳"）
        cleaned = cleaned.replace(/\s*[、]\s*/g, '、');

        // 10. 压缩多余空格为单个空格
        cleaned = cleaned.replace(/\s{2,}/g, ' ');

        // 11. 去除首尾空白
        cleaned = cleaned.trim();

        return cleaned;
    }

    /**
     * 判断是否是章节标题
     */
    isChapterTitle(line) {
        // 匹配："一、"、"二、"（必须带顿号）或 "第一章"、"第二章" 等
        // 注意：单独的"一"、"二"后面没有顿号的不是章节标题
        return /^(一|二|三|四|五|六|七|八|九|十|十一|十二|十[三四五六七八九十])、|^第[一二三四五六七八九十百零千]+章/.test(line);
    }

    /**
     * 判断是否是小节标题
     */
    isSectionTitle(line) {
        // 匹配：包含"办法"、"规定"、"管理"等关键词的短文本
        const isShort = line.length < 100;
        const hasKeyword = /办法|规定|管理|细则|条例|试行|修订/.test(line);
        return isShort && hasKeyword;
    }

    /**
     * 识别文档块类型
     */
    identifyChunkType(text) {
        if (/第.*条/.test(text)) return 'article';
        if (/说明|释义|定义/.test(text)) return 'explanation';
        if (/办法|规定|条例|细则/.test(text)) return 'policy';
        return 'content';
    }

    /**
     * 合并小块为较大的块（暂时禁用，保持原始分块）
     */
    mergeSmallChunks(minLength = 500, maxLength = 1500) {
        console.log('✓ 跳过合并步骤，保持原始分块');
        // 不再合并，保持每个段落独立
        return this.chunks;
    }

    /**
     * 添加上下文窗口
     */
    addContextWindow(windowSize = 1) {
        console.log('✓ 添加上下文窗口...');

        const chunksWithContext = this.chunks.map((chunk, index) => {
            const beforeChunks = this.chunks.slice(Math.max(0, index - windowSize), index);
            const afterChunks = this.chunks.slice(index + 1, Math.min(this.chunks.length, index + windowSize + 1));

            // 只取相同页面的上下文
            const samePageBefore = beforeChunks.filter(c => c.page_num === chunk.page_num);
            const samePageAfter = afterChunks.filter(c => c.page_num === chunk.page_num);

            const beforeText = samePageBefore.map(c => c.text).join('\n');
            const afterText = samePageAfter.map(c => c.text).join('\n');

            return {
                ...chunk,
                context_before: beforeText,
                context_after: afterText,
                full_context: beforeText + '\n' + chunk.text + '\n' + afterText
            };
        });

        this.chunks = chunksWithContext;
        console.log('✓ 上下文窗口添加完成');
        return this.chunks;
    }

    /**
     * 保存为JSON文件
     */
    async saveChunks(outputPath) {
        try {
            const jsonPath = outputPath || path.join(__dirname, '../../document_chunks.json');
            await fs.writeFile(jsonPath, JSON.stringify(this.chunks, null, 2), 'utf-8');
            console.log(`✓ 文档块已保存到：${jsonPath}`);
            return jsonPath;
        } catch (error) {
            console.error('✗ 保存文档块失败：', error.message);
            throw error;
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        if (!this.chunks || this.chunks.length === 0) {
            return null;
        }

        const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
        const avgLength = Math.round(totalLength / this.chunks.length);

        const typeCounts = {};
        this.chunks.forEach(chunk => {
            typeCounts[chunk.chunk_type] = (typeCounts[chunk.chunk_type] || 0) + 1;
        });

        const pageCounts = {};
        this.chunks.forEach(chunk => {
            pageCounts[chunk.page_num] = (pageCounts[chunk.page_num] || 0) + 1;
        });

        const uniquePages = Object.keys(pageCounts).map(Number).sort((a, b) => a - b);

        return {
            totalChunks: this.chunks.length,
            totalLength,
            avgLength,
            typeCounts,
            totalPages: uniquePages.length,
            pageRange: `${uniquePages[0]}-${uniquePages[uniquePages.length - 1]}`
        };
    }
}

// 导出
module.exports = DocumentProcessor;

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        const processor = new DocumentProcessor();

        try {
            // 1. 加载学生手册
            await processor.loadHandbook();

            // 2. 分块
            processor.chunkDocument();

            // 3. 合并小块
            processor.mergeSmallChunks();

            // 4. 添加上下文
            processor.addContextWindow();

            // 5. 保存
            await processor.saveChunks();

            // 6. 显示统计
            const stats = processor.getStats();
            console.log('\n✓ 统计信息：');
            console.log(`  - 总块数：${stats.totalChunks}`);
            console.log(`  - 总字数：${stats.totalLength}`);
            console.log(`  - 平均字数：${stats.avgLength}`);
            console.log(`  - 总页数：${stats.totalPages}`);
            console.log(`  - 页码范围：${stats.pageRange}`);
            console.log(`  - 类型分布：`, stats.typeCounts);

            // 7. 验证重要页面
            console.log('\n✓ 验证重要页面：');
            const importantPages = [138, 139, 144, 145];
            const pageCounts = {};
            processor.chunks.forEach(chunk => {
                pageCounts[chunk.page_num] = (pageCounts[chunk.page_num] || 0) + 1;
            });

            importantPages.forEach(pageNum => {
                const count = pageCounts[pageNum] || 0;
                console.log(`  - 第${pageNum}页：${count}个文档块 ${count > 0 ? '✅' : '❌'}`);
            });

        } catch (error) {
            console.error('处理失败：', error);
            process.exit(1);
        }
    })();
}
