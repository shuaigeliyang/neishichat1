# -*- coding: utf-8 -*-
"""
PDF文档提取脚本
设计师：内师智能体系统 (￣▽￣)ﾉ
功能：从PDF提取文本并进行降噪处理
"""

import sys
import re
import json
import os

try:
    import pdfplumber
except ImportError:
    print("请先安装pdfplumber: pip install pdfplumber")
    sys.exit(1)

# 噪音模式
NOISE_PATTERNS = [
    r'^[，。、；：""''（）【】《》!?.,;\'\"()[\]\s\-—…·]+$',  # 纯标点
    r'^—\s*\d+\s*—$',  # 页码标记
    r'^\d+\s*[—\-]\s*\d+$',  # 页码范围
    r'^\s*$',  # 空行
    r'^[a-zA-Z0-9\s]{1,3}$',  # 过短字符
    r'^·\s*$',  # 孤立项目符号
    r'^\.\.\.+$',  # 省略号
]

# 停用词
STOP_WORDS = set([
    '的', '是', '在', '和', '与', '或', '了', '我', '你', '他', '她', '它', '们',
    '吗', '呢', '吧', '啊', '哦', '嗯', '这', '那', '一个', '可以', '这个', '那个',
])

# 有效关键词
VALID_KEYWORDS = [
    '规定', '学生', '学校', '课程', '考试', '成绩', '学分', '毕业', '学位',
    '奖惩', '管理', '申请', '办法', '条件', '程序', '时间', '地点', '标准',
    '要求', '原则', '制度', '纪律', '行为', '教学', '教师', '辅导员', '专业',
    '学年', '学期', '选课', '重修', '补考', '不及格', '奖学金', '助学金',
    '贷款', '宿舍', '请假', '休学', '复学', '退学', '转专业', '补修', '缓考',
    '作弊', '违规', '处分', '警告', '记过', '开除', '条', '章', '节', '第'
]


def is_noise(text):
    """检查是否为噪音文本"""
    if not text or len(text.strip()) < 2:
        return True

    for pattern in NOISE_PATTERNS:
        if re.match(pattern, text.strip()):
            return True

    # 统计中文字符
    chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', text))
    if chinese_chars / max(len(text), 1) < 0.3:
        return True

    return False


def is_valid_content(text):
    """检查是否为有效内容"""
    if len(text) < 5:
        return False

    # 检查关键词
    for keyword in VALID_KEYWORDS:
        if keyword in text:
            return True

    # 中文数字开头
    if re.match(r'^[一二三四五六七八九十百千万亿]+[、.．]', text):
        return True

    # 第X条
    if re.search(r'第[零一二三四五六七八九十百千万亿0-9]+条', text):
        return True

    # 括号内条款
    if re.search(r'\([一二三四五六七八九十0-9]+\)', text):
        return True

    return False


def clean_text(text):
    """清理和修复文本"""
    # 修复空格问题
    text = re.sub(r'([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])', r'\1\2', text)

    # 修复数字单位
    text = re.sub(r'(\d)\s+(分|元|人|门|次|年|月|日|号|页|条|款|名|期|岁|%)', r'\1\2', text)

    # 修复标点空格
    text = re.sub(r'\s+([，,。、;；:：!！?？])', r'\1', text)
    text = re.sub(r'([，,。、;；:：!！?？])\s+', r'\1', text)

    # 修复括号
    text = re.sub(r'\(\s+', '(', text)
    text = re.sub(r'\s+\)', ')', text)

    # 修复书名号
    text = re.sub(r'《\s+', '《', text)
    text = re.sub(r'\s+》', '》', text)

    # 修复章节序号
    text = re.sub(r'第\s+([一二三四五六七八九十百千万亿]+)条', r'第\1条', text)

    return text


def extract_pdf(pdf_path):
    """提取PDF内容"""
    print(f"📄 加载PDF文件: {pdf_path}")

    all_lines = []
    page_count = 0

    with pdfplumber.open(pdf_path) as pdf:
        page_count = len(pdf.pages)
        print(f"✓ PDF页数: {page_count}")

        for i, page in enumerate(pdf.pages):
            page_num = i + 1

            # 提取文本
            text = page.extract_text()

            if not text:
                continue

            # 按行分割
            lines = text.split('\n')

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # 降噪
                if is_noise(line):
                    continue

                # 清理
                cleaned = clean_text(line)

                # 验证
                if not is_valid_content(cleaned):
                    continue

                all_lines.append({
                    'page': page_num,
                    'text': cleaned,
                    'original': line
                })

    return all_lines, page_count


def generate_chunks(lines, total_pages):
    """生成文档块"""
    print(f"\n📦 生成文档块...")

    chunks = []
    chunk_id = 0
    current_chapter = '未分类'
    current_section = ''

    for line_data in lines:
        text = line_data['text']
        page_num = line_data['page']

        # 检测章节标题
        if len(text) < 50:
            # 第X章
            if re.match(r'^第[一二三四五六七八九十百千]+章', text):
                current_chapter = text
                current_section = ''
                chunks.append({
                    'id': len(chunks) + 1,
                    'text': text,
                    'page_number': page_num,
                    'chapter_title': text,
                    'section_title': '',
                    'chunk_type': 'chapter'
                })
                continue

            # 第X节
            if re.match(r'^第[一二三四五六七八九十百千]+节', text):
                current_section = text
                chunks.append({
                    'id': len(chunks) + 1,
                    'text': text,
                    'page_number': page_num,
                    'chapter_title': current_chapter,
                    'section_title': text,
                    'chunk_type': 'section'
                })
                continue

            # 法规名称
            if any(kw in text for kw in ['办法', '规定', '制度', '细则', '条例', '规范']):
                if not re.search(r'[)）]$', text):  # 不是括号结尾
                    current_chapter = text
                    chunks.append({
                        'id': len(chunks) + 1,
                        'text': text,
                        'page_number': page_num,
                        'chapter_title': text,
                        'section_title': '',
                        'chunk_type': 'title'
                    })
                    continue

        # 普通内容
        chunks.append({
            'id': len(chunks) + 1,
            'text': text,
            'page_number': page_num,
            'chapter_title': current_chapter,
            'section_title': current_section,
            'chunk_type': 'content'
        })

    print(f"✓ 生成 {len(chunks)} 个文档块")

    # 统计
    type_stats = {}
    for c in chunks:
        t = c['chunk_type']
        type_stats[t] = type_stats.get(t, 0) + 1

    print("\n📊 类型统计:")
    for t, count in type_stats.items():
        print(f"  - {t}: {count}")

    return chunks


def deduplicate(chunks):
    """去重"""
    print("\n🔄 去重...")

    seen = set()
    unique = []

    for chunk in chunks:
        key = chunk['text'][:50]
        if key not in seen:
            seen.add(key)
            unique.append(chunk)

    print(f"✓ 去重: {len(chunks)} → {len(unique)}")

    return unique


def add_context(chunks, window=2):
    """添加上下文"""
    print("\n🔗 添加上下文...")

    result = []

    for i, chunk in enumerate(chunks):
        before = chunks[max(0, i-window):i]
        after = chunks[i+1:min(len(chunks), i+window+1)]

        before_text = ' '.join([c['text'] for c in before])
        after_text = ' '.join([c['text'] for c in after])

        result.append({
            **chunk,
            'context_before': before_text,
            'context_after': after_text,
            'full_context': f"{before_text} {chunk['text']} {after_text}".strip()
        })

    return result


def main():
    print("=" * 60)
    print("🚀 PDF文档提取和降噪")
    print("=" * 60)

    # PDF路径
    pdf_path = os.path.join(os.path.dirname(__file__), '..', '相关文档', '2025年本科学生手册-定 (1).pdf')

    # 1. 提取PDF
    lines, total_pages = extract_pdf(pdf_path)
    print(f"\n✓ 提取 {len(lines)} 行有效文本")

    # 2. 生成块
    chunks = generate_chunks(lines, total_pages)

    # 3. 去重
    chunks = deduplicate(chunks)

    # 4. 添加上下文
    chunks = add_context(chunks)

    # 5. 保存
    output_path = os.path.join(os.path.dirname(__file__), '..', 'document_chunks_from_pdf.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 保存到: {output_path}")
    print(f"  文件大小: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")

    # 6. 样例
    print("\n📋 样例（前5个）:")
    for i, chunk in enumerate(chunks[:5]):
        print(f"\n{i+1}. [{chunk['chapter_title'][:20]}...] 第{chunk['page_number']}页")
        print(f"   类型: {chunk['chunk_type']}")
        print(f"   内容: {chunk['text'][:80]}...")

    print("\n" + "=" * 60)
    print("✅ 完成!")
    print("=" * 60)


if __name__ == '__main__':
    main()
