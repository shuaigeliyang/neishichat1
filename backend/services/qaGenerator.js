/**
 * 问答生成器
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：基于检索到的文档生成回答
 */

const axios = require('axios');

class QAGenerator {
    constructor(apiKey, model = 'glm-4-flash') {
        this.apiKey = apiKey;
        this.apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        this.model = model;
    }

    /**
     * 生成回答
     */
    async generateAnswer(question, retrievedDocs, options = {}) {
        const {
            maxTokens = 2000,
            temperature = 0.3,
            includeCitations = true
        } = options;

        // 构建上下文
        const context = this.buildContext(retrievedDocs, includeCitations);

        // 构建提示词
        const prompt = this.buildPrompt(question, context);

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt()
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: temperature
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            const answer = response.data.choices[0].message.content;

            return {
                answer,
                sources: this.extractSources(retrievedDocs),
                context: context,
                model: this.model,
                usage: response.data.usage
            };

        } catch (error) {
            console.error('✗ 生成回答失败：', error.message);
            throw error;
        }
    }

    /**
     * 构建系统提示词
     */
    getSystemPrompt() {
        return `你是内江师范学院的学生助手，专门基于《学生手册》回答学生和辅导员的问题。

【核心原则】：
1. **准确性第一**：所有回答必须基于提供的文档片段，不能编造信息
2. **清晰易懂**：用简单明了的语言解释政策和流程
3. **引用标注**：在回答中标注引用的章节和页码
4. **结构化回答**：使用清晰的分段和要点

【回答格式要求（非常重要）】：
- 使用 Markdown 格式，确保排版清晰易读
- 使用 **粗体** 标注关键信息（如费用金额、条件要求、重要日期等）
- 使用列表（- 开头）列出多条信息
- 对于流程类问题，使用有序列表（1. 2. 3.）按步骤说明
- 对于条件类问题，逐条列出各项条件
- 如果涉及具体金额、分数等数字，用 **粗体** 突出显示
- 每个条目之间空一行，增加可读性

【回答结构】：
1. 先给出直接、简洁的答案
2. 然后列出详细说明
3. 最后标注参考来源

【示例格式】：
是的，重修需要交费。

**费用标准**：**60元/学分**

具体规定如下：
- 补考不合格者必须重修（通识选修课除外）
- 应在办理重修手续后缴纳费用
- 逾期不缴者视为自动放弃本次重修机会
- 重修成绩按不超过 **70分** 记入档案，注明"重修"字样

> 参考：《课程重修管理办法》第145页

【注意事项】：
- 不要使用文档之外的知识
- 保持客观、专业的语气
- 如果信息不确定，建议学生咨询相关部门
- 绝对不要输出 PDF 提取的原始乱码文本，必须整理为通顺的中文`;
    }

    /**
     * 构建用户提示词
     */
    buildPrompt(question, context) {
        return `【学生问题】：
${question}

【相关文档片段】：
${context}

【要求】：
1. 严格基于上述文档片段回答问题
2. 如果文档片段中没有答案，明确告知学生
3. 在回答中标注引用的章节和页码
4. 回答要清晰、准确、完整

【回答】：`;
    }

    /**
     * 构建上下文
     */
    buildContext(retrievedDocs, includeCitations) {
        return retrievedDocs.map((doc, index) => {
            const citation = includeCitations
                ? `\n[来源：第${doc.chunk.page_num}页]`
                : '';

            return `文档片段${index + 1}（相关度：${(doc.score * 100).toFixed(0)}%）：
${doc.chunk.text}${citation}`;
        }).join('\n\n---\n\n');
    }

    /**
     * 提取来源信息
     */
    extractSources(retrievedDocs) {
        return retrievedDocs.map(doc => ({
            chapter: `第${doc.chunk.page_num}页`,
            page: doc.chunk.page_num,
            score: doc.score,
            snippet: doc.chunk.text.substring(0, 100) + '...'
        }));
    }

    /**
     * 格式化回答（添加来源标注）
     */
    formatAnswer(answer, sources) {
        let formatted = answer;

        // 如果回答中没有来源标注，添加来源列表
        if (!formatted.includes('来源') && !formatted.includes('引用')) {
            formatted += '\n\n---\n\n**参考资料**：\n';
            sources.forEach((source, index) => {
                // ✨ 修复：直接使用chapter，不再重复添加页码
                formatted += `${index + 1}. ${source.chapter}\n`;
            });
        }

        return formatted;
    }

    /**
     * 检查回答质量
     */
    checkAnswerQuality(answer, retrievedDocs) {
        const warnings = [];

        // 检查是否包含"不知道"、"未找到"等关键词
        if (answer.includes('未找到') || answer.includes('没有相关')) {
            warnings.push('文档中可能没有相关信息');
        }

        // 检查最高相关度
        const maxScore = Math.max(...retrievedDocs.map(d => d.score));
        if (maxScore < 0.6) {
            warnings.push('相关度较低，建议补充信息');
        }

        // 检查文档数量
        if (retrievedDocs.length < 2) {
            warnings.push('参考文档较少，可能需要更多信息');
        }

        return {
            hasWarnings: warnings.length > 0,
            warnings,
            maxScore,
            docCount: retrievedDocs.length
        };
    }

    /**
     * 流式生成回答（用于实时显示）
     */
    async *generateAnswerStream(question, retrievedDocs, options = {}) {
        const {
            maxTokens = 2000,
            temperature = 0.3,
            includeCitations = true
        } = options;

        const context = this.buildContext(retrievedDocs, includeCitations);
        const prompt = this.buildPrompt(question, context);

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt()
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: temperature,
                    stream: true
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000,
                    responseType: 'stream'
                }
            );

            // 流式处理
            for await (const chunk of response.data) {
                const line = chunk.toString();
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        break;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }

        } catch (error) {
            console.error('✗ 流式生成失败：', error.message);
            throw error;
        }
    }
}

// 导出
module.exports = QAGenerator;

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        const generator = new QAGenerator(process.env.ZHIPU_API_KEY || 'your-api-key-here');

        try {
            // 模拟检索到的文档
            const mockDocs = [
                {
                    chunk: {
                        text: '课程重修管理办法：学生每学期重修课程不得超过2门。重修课程需按规定缴纳重修费。',
                        chapter_title: '课程重修管理办法',
                        page_num: 138
                    },
                    score: 0.85
                },
                {
                    chunk: {
                        text: '重修申请流程：学生需在每学期开学后两周内提出申请，经学院审核后报教务处审批。',
                        chapter_title: '课程重修管理办法',
                        page_num: 139
                    },
                    score: 0.78
                }
            ];

            const question = '重修需要什么条件？';

            // 生成回答
            console.log('✓ 生成回答...\n');
            const result = await generator.generateAnswer(question, mockDocs);

            console.log('【回答】');
            console.log(result.answer);
            console.log('\n【来源】');
            result.sources.forEach((source, index) => {
                console.log(`${index + 1}. ${source.chapter}（第${source.page}页）`);
            });

            // 检查质量
            const quality = generator.checkAnswerQuality(result.answer, mockDocs);
            console.log('\n【质量检查】');
            console.log(`  - 最高相关度：${quality.maxScore.toFixed(2)}`);
            console.log(`  - 参考文档数：${quality.docCount}`);
            if (quality.hasWarnings) {
                console.log(`  - 警告：${quality.warnings.join('；')}`);
            }

        } catch (error) {
            console.error('测试失败：', error);
            process.exit(1);
        }
    })();
}
