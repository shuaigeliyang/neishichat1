/**
 * 学生手册内容查询API
 * 设计师：内师智能体系统 (￣▽￣)ﾉ
 * 功能：获取指定页面的完整内容
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/handbook/page/:pageNum
 * 获取指定页面的完整内容
 */
router.get('/page/:pageNum', async (req, res) => {
  try {
    const pageNum = parseInt(req.params.pageNum);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: '页码格式错误'
      });
    }

    // 加载学生手册数据
    const handbookPath = path.join(__dirname, '../../../student_handbook_full.json');
    const data = await fs.readFile(handbookPath, 'utf-8');
    const handbook = JSON.parse(data);

    // 查找指定页面
    const page = handbook.pages.find(p => p.page_num === pageNum);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: `第${pageNum}页不存在`
      });
    }

    // 返回页面内容
    res.json({
      success: true,
      data: {
        page_num: page.page_num,
        text: page.text,
        total_pages: handbook.total_pages
      }
    });

  } catch (error) {
    console.error('获取手册页面失败：', error);
    res.status(500).json({
      success: false,
      message: '获取页面内容失败：' + error.message
    });
  }
});

/**
 * GET /api/handbook/search
 * 在手册中搜索关键词
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword, limit = 10 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词'
      });
    }

    // 加载学生手册数据
    const handbookPath = path.join(__dirname, '../../../student_handbook_full.json');
    const data = await fs.readFile(handbookPath, 'utf-8');
    const handbook = JSON.parse(data);

    // 搜索包含关键词的页面
    const results = [];
    for (const page of handbook.pages) {
      if (page.text.toLowerCase().includes(keyword.toLowerCase())) {
        // 提取关键词周围的上下文
        const index = page.text.toLowerCase().indexOf(keyword.toLowerCase());
        const start = Math.max(0, index - 50);
        const end = Math.min(page.text.length, index + keyword.length + 50);
        const context = page.text.substring(start, end);

        results.push({
          page_num: page.page_num,
          context: '...' + context + '...'
        });

        if (results.length >= parseInt(limit)) break;
      }
    }

    res.json({
      success: true,
      data: {
        keyword,
        total_results: results.length,
        results
      }
    });

  } catch (error) {
    console.error('搜索手册失败：', error);
    res.status(500).json({
      success: false,
      message: '搜索失败：' + error.message
    });
  }
});

module.exports = router;
