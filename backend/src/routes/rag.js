/**
 * RAG文档问答API路由
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：提供文档问答的HTTP接口
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const RAGService = require('../../services/ragService');

// 创建RAG服务实例
const ragService = new RAGService(process.env.ZHIPU_API_KEY, {
    embeddingMode: process.env.EMBEDDING_MODE || 'api'  // ✨ 从环境变量读取embedding模式
});

/**
 * 同义词映射表 - 将口语化表达转换为正式用语
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 版本：v2.0 - 完整版（涵盖教育领域常见口语化表达）
 */
const SYNONYM_MAP = {
    // 成绩与考核
    '挂科': '不及格',
    '挂了': '不及格',
    '没过': '不及格',
    '考砸了': '成绩不合格',
    '考得很差': '成绩不合格',
    '考得好': '成绩优秀',
    '满分': '100分',
    '及格': '成绩合格',
    '过了': '通过',
    '通过': '通过考核',

    // 纪律与处分
    '被抓': '被处分',
    '背处分': '受到处分',
    '记过': '记过处分',
    '警告': '警告处分',
    '处分': '纪律处分',
    '被抓作弊': '考试作弊',
    '作弊被抓': '考试作弊',
    '违纪': '违反纪律',
    '违规': '违反规定',

    // 奖励与荣誉
    '拿奖学金': '获得奖学金',
    '评奖学金': '申请奖学金',
    '拿奖': '获得奖励',
    '得奖': '获得奖励',
    '评优': '评优评先',
    '评先': '评优评先',

    // 课程与学习
    '选课': '选择课程',
    '退课': '退选课程',
    // 注意："重修"是手册原文用词，不能替换为其他词，否则会导致RAG检索失败
    '重读': '重修',
    '补考': '课程补考',
    '重考': '补考',
    '补修': '补修课程',
    '免修': '免修课程',
    '旁听': '旁听课程',

    // 学籍管理
    '退学': '退学处理',
    '休学': '休学申请',
    '复学': '复学申请',
    '转专业': '转换专业',
    '转系': '转换专业',
    '升学': '升入高年级',
    '留级': '留级处理',
    '跳级': '跳级学习',
    '延毕': '延期毕业',
    '结业': '结业处理',
    '肄业': '肄业证书',

    // 宿舍生活
    '住校': '住校学习',
    '走读': '走读生',
    '换宿舍': '调换宿舍',
    '搬出去': '外宿申请',
    '住外面': '校外住宿',

    // 考勤管理
    '请假': '请假申请',
    '缺勤': '缺席',
    '旷课': '无故旷课',
    '迟到': '迟到记录',
    '早退': '早退记录',
    '逃课': '旷课',
    '翘课': '旷课',

    // 证件办理
    '办证': '办理证件',
    '补办': '补办证件',
    '丢证件': '证件丢失',
    '学生证': '学生证件',
    '校园卡': '一卡通',

    // 实践环节
    '实习': '实习课程',
    '实训': '实训课程',
    '见习': '见习活动',
    '做实验': '实验课程',
    '写论文': '毕业论文',
    '答辩': '论文答辩',

    // 费用相关
    '学费': '学费费用',
    '住宿费': '住宿费用',
    '书本费': '教材费用',
    '报名费': '报名费用',
    '重修费': '重修费用',
    // ✨ 新增：口语化表达到正式用语的映射
    '要钱': '收费',
    '多少钱': '费用',
    '要交钱': '需要缴费',
    '要多少钱': '收费标准',
    '收费': '费用',
    '交钱': '缴费',
    '费用': '费用标准',
    '收费标准': '费用标准',

    // ✨ 新增：后果和影响相关的口语化表达
    '会怎么样': '后果',
    '怎么样': '后果',
    '会怎样': '后果',
    '结果怎么样': '后果',
    '有什么后果': '后果',
    '后果是什么': '后果',
    '有什么影响': '影响',
    '会怎么样了': '后果',
    '会怎样了': '后果',
    '最后怎么样': '后果',
    '最后会怎样': '后果',
    '会导致什么': '导致',
    '会引起什么': '引起',

    // 时间表达
    '这学期': '本学期',
    '下学期': '下一学期',
    '上学期': '上一学期',
    '开学': '开学时间',
    '放假': '假期',
    '寒暑假': '寒假和暑假',
    '周末': '周末时间',

    // 咨询询问
    '问问': '咨询',
    '问一下': '咨询',
    '想了解': '了解情况',
    '想知道': '咨询',
    '怎么申请': '申请流程',
    '怎么办': '如何处理',
    '怎么做': '操作流程',
    '去哪办': '办理地点',
    '找谁办': '办理部门',
    '要什么材料': '所需材料',
    '需要什么': '所需材料',

    // 疑问词汇
    '能不能': '是否可以',
    '可不可以': '是否可以',
    '行不行': '是否可行',
    '好不好': '是否合适',
    '对不对': '是否正确',
    '有没有': '是否存在',
    '会不会': '是否会',
    '要多久': '需要多长时间',
    '什么时候': '时间',
    '在哪': '地点',
    '哪些': '哪些内容',

    // 程度表达
    '很严重': '严重',
    '不太严重': '轻微',
    '严重': '重大',
    '轻微': '较轻',

    // 数量表达
    '很多': '大量',
    '很少': '少量',
    '几次': '多次',

    // 称呼相关
    '老大': '辅导员',
    '导员': '辅导员',
    '班导': '班主任',
    '学长': '高年级学生',
    '学姐': '高年级女学生',
    '学弟': '低年级学生',
    '学妹': '低年级女学生',
    '室友': '同宿舍学生',
    '班长': '班级班长',

    // 组织活动
    '学生会': '学生组织',
    '社团': '学生社团',
    '活动': '校园活动',
    '比赛': '竞赛',
    '竞赛': '学科竞赛',
    '入党': '加入中国共产党',
    '转正': '党员转正',
    '当干部': '担任学生干部',
    '当班干部': '担任班级干部',

    // 情感心理
    '不开心': '情绪低落',
    '压力大': '心理压力',
    '想家': '思乡',
    '适应不了': '无法适应',
    '不想上了': '退学意向',
    '不想读': '退学意向',
    '读不下去': '学习困难',

    // 行为规范
    '打架': '打架斗殴',
    '吵架': '争吵',
    '喝酒': '饮酒',
    '抽烟': '吸烟',
    '打游戏': '电子游戏',
    '网吧': '上网服务场所',
    '夜不归宿': '夜不归寝',

    // 日常表达
    '靠谱': '可靠',
    '不靠谱': '不可靠',
    '麻烦': '复杂',
    '简单': '简便',
    '快': '迅速',
    '慢': '迟缓',
    '好': '优秀',
    '差': '较差',
    '行': '可以',
    '不行': '不可以',
    '没问题': '符合要求',
    '有问题': '存在困难'
};

/**
 * 标准化问题 - 将口语化表达转换为正式用语
 */
function normalizeQuestion(question) {
    let normalized = question;

    // 🔒 特殊处理1：当问题关于"挂科"或"不及格"时，如果缺少主语，自动添加"学生"
    // 这样可以避免单独的"不及格"无法匹配到文档的问题
    if (
        (question.includes('挂科') || question.includes('不及格')) &&
        !question.includes('学生') &&
        !question.includes('我的') &&  // 避免与"我的学生"重复
        (question.includes('怎么办') || question.includes('会怎么样') || question.includes('怎么处理') || question.includes('如何处理'))
    ) {
        console.log('📝 检测到缺少主语，自动添加"学生"主语');
        console.log(`   原始问题：${question}`);

        // 在"挂科"前添加"学生"
        normalized = normalized.replace(/挂科/g, '学生挂科');

        console.log(`   修正后问题：${normalized}`);
        console.log('   💡 这样可以更好地匹配到学生手册中的文档');
    }

    // 🔒 特殊处理2：当问题关于"重修"、"补考"时，如果缺少主语，自动添加"课程"
    // 文档中是"课程重修管理办法"、"课程补考管理办法"
    if (
        (question.includes('重修') || question.includes('补考')) &&
        !question.includes('课程') &&
        !question.includes('学生') &&
        !question.includes('我的')
    ) {
        console.log('📝 检测到缺少主语，自动添加"课程"主语');
        console.log(`   原始问题：${question}`);

        // 在"重修"或"补考"前添加"课程"
        normalized = normalized.replace(/重修/g, '课程重修');
        normalized = normalized.replace(/补考/g, '课程补考');

        console.log(`   修正后问题：${normalized}`);
        console.log('   💡 这样可以更好地匹配到课程重修/补考相关文档');
    }

    // 替换所有同义词
    for (const [colloquial, formal] of Object.entries(SYNONYM_MAP)) {
        const regex = new RegExp(colloquial, 'g');
        normalized = normalized.replace(regex, formal);
    }

    // 如果问题发生了变化，记录日志
    if (normalized !== question) {
        console.log(`📝 问题标准化：`);
        console.log(`   原始：${question}`);
        console.log(`   标准化：${normalized}`);
    }

    return normalized;
}

/**
 * 初始化RAG服务
 */
router.post('/initialize', authenticate, async (req, res) => {
    try {
        await ragService.initialize();
        res.json({
            success: true,
            message: 'RAG服务初始化成功',
            stats: ragService.getStats()
        });
    } catch (error) {
        console.error('初始化失败：', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 问答接口
 */
router.post('/answer', authenticate, async (req, res) => {
    try {
        console.log('\n========================================');
        console.log('📚 [RAG] 收到问答请求');
        console.log('========================================');

        const { question, options = {} } = req.body;

        console.log('📝 原始问题：', question);
        console.log('📋 请求选项：', options);

        if (!question) {
            console.log('❌ 错误：问题为空');
            return res.status(400).json({
                success: false,
                error: '请提供问题'
            });
        }

        // 标准化问题（将口语化表达转换为正式用语）
        const normalizedQuestion = normalizeQuestion(question);

        console.log('📝 标准化后问题：', normalizedQuestion);

        // 如果未初始化，先初始化
        if (!ragService.initialized) {
            console.log('🔧 RAG服务未初始化，开始初始化...');
            await ragService.initialize();
            console.log('✅ RAG服务初始化完成');
        } else {
            console.log('✅ RAG服务已初始化');
        }

        console.log('🚀 开始调用RAG服务...');

        // 调用问答服务，增加检索数量以获得更多来源
        const result = await ragService.answer(normalizedQuestion, {
            ...options,
            topK: options.topK || 10,  // 增加到10，这样去重后仍有足够来源
            minScore: options.minScore || 0.3  // 默认从0.5降低到0.3
        });

        // ✨ 来源去重：同一页码只保留评分最高的一个
        if (result.sources && result.sources.length > 0) {
            const beforeCount = result.sources.length;

            // 使用Map按页码分组，保留评分最高的
            const sourceMap = new Map();

            result.sources.forEach(source => {
                const key = `${source.chapter}_${source.page}`;
                const existing = sourceMap.get(key);

                // 如果不存在，或当前source评分更高，则保留
                if (!existing || (source.score && source.score > (existing.score || 0))) {
                    sourceMap.set(key, source);
                }
            });

            // 转换回数组，按评分排序
            result.sources = Array.from(sourceMap.values()).sort((a, b) => {
                return (b.score || 0) - (a.score || 0);
            });

            const afterCount = result.sources.length;

            if (beforeCount !== afterCount) {
                console.log(`\n✨ 来源去重：${beforeCount} 条 → ${afterCount} 条（去重 ${beforeCount - afterCount} 条）`);
            }
        }

        // 📊 Rerank统计日志 - 优化1：添加详细的Rerank验证信息
        console.log('📊 Rerank统计：');
        console.log(`   原始问题：${question}`);
        if (normalizedQuestion !== question) {
            console.log(`   标准化问题：${normalizedQuestion}`);
        }
        console.log(`   使用Rerank：${options.useReranking !== false ? '是' : '否'}`);

        // 检查sources中是否包含rerankMethod信息
        if (result.sources && result.sources.length > 0) {
            const rerankMethods = result.sources.map(s => s.rerankMethod || 'unknown');
            const uniqueMethods = [...new Set(rerankMethods)];

            console.log(`   Rerank方法：${uniqueMethods.join(', ')}`);
            console.log(`   置信度：${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   返回文档数：${result.sources.length}`);
            console.log(`   耗时：${result.elapsed}ms`);

            // 显示每个文档的rerank信息
            if (process.env.NODE_ENV === 'development') {
                result.sources.forEach((source, index) => {
                    console.log(`   文档${index + 1}: score=${source.score?.toFixed(3)}, rerankMethod=${source.rerankMethod || 'unknown'}`);
                });
            }
        } else {
            console.log('   未找到相关文档');
        }

        res.json({
            success: true,
            data: {
                ...result,
                originalQuestion: question,
                normalizedQuestion: normalizedQuestion !== question ? normalizedQuestion : undefined
            }
        });

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ [RAG] 问答处理失败');
        console.error('========================================');
        console.error('错误类型：', error.constructor.name);
        console.error('错误消息：', error.message);
        console.error('错误堆栈：', error.stack);
        console.error('问题内容：', question);
        console.error('========================================\n');

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 批量问答接口
 */
router.post('/batch-answer', authenticate, async (req, res) => {
    try {
        const { questions, options } = req.body;

        if (!questions || !Array.isArray(questions)) {
            return res.status(400).json({
                success: false,
                error: '请提供问题数组'
            });
        }

        // 如果未初始化，先初始化
        if (!ragService.initialized) {
            await ragService.initialize();
        }

        // 调用批量问答
        const results = await ragService.batchAnswer(questions, options);

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('批量问答失败：', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 流式问答接口（Server-Sent Events）
 */
router.get('/answer-stream', authenticate, async (req, res) => {
    try {
        const { question, topK, minScore } = req.query;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: '请提供问题'
            });
        }

        // 设置SSE响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 如果未初始化，先初始化
        if (!ragService.initialized) {
            await ragService.initialize();
        }

        // 流式问答
        for await (const chunk of ragService.answerStream(question, {
            topK: topK ? parseInt(topK) : undefined,
            minScore: minScore ? parseFloat(minScore) : undefined
        })) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('流式问答失败：', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

/**
 * 获取统计信息
 */
router.get('/stats', authenticate, (req, res) => {
    try {
        const stats = ragService.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取统计失败：', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 保存状态
 */
router.post('/save-state', authenticate, async (req, res) => {
    try {
        await ragService.saveState();
        res.json({
            success: true,
            message: '状态保存成功'
        });
    } catch (error) {
        console.error('保存状态失败：', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
