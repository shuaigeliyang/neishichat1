#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
学生手册PDF完整提取工具
设计师：内师智能体系统
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pdfplumber
import json
from pathlib import Path

def extract_full_pdf(pdf_path, output_path):
    """提取完整的PDF内容"""
    print(f"正在读取PDF文件：{pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"\n✓ 总页数：{total_pages}")
        print(f"✓ 正在提取全部内容...")

        content = {
            "total_pages": total_pages,
            "pages": []
        }

        # 提取所有页面
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                content["pages"].append({
                    "page_num": i + 1,
                    "text": text.strip()
                })

            # 每50页显示进度
            if (i + 1) % 50 == 0:
                print(f"  - 已提取 {i + 1}/{total_pages} 页")

        # 保存为JSON
        print(f"\n✓ 正在保存到文件...")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)

        print(f"✓ 提取完成！")
        print(f"  - 总页数：{total_pages}")
        print(f"  - 提取页数：{len(content['pages'])}")
        print(f"  - 保存路径：{output_path}")

        return content

def analyze_structure(content):
    """分析文档结构"""
    print(f"\n✓ 正在分析文档结构...")

    # 识别章节标题（简单规则：短文本且可能是标题）
    potential_titles = []
    for page in content["pages"]:
        text = page["text"]
        lines = text.split('\n')
        for line in lines[:5]:  # 只看每页前几行
            line = line.strip()
            if 10 <= len(line) <= 50 and "办法" in line or "规定" in line or "管理" in line:
                potential_titles.append({
                    "page": page["page_num"],
                    "title": line
                })

    print(f"\n✓ 识别到的可能章节（前20个）：")
    for title in potential_titles[:20]:
        print(f"  - 第{title['page']}页: {title['title']}")

if __name__ == "__main__":
    pdf_path = r"E:\外包\教育系统智能体\相关文档\2025年本科学生手册-定 (1).pdf"
    output_path = r"E:\外包\教育系统智能体\student_handbook_full.json"

    # 提取完整内容
    content = extract_full_pdf(pdf_path, output_path)

    # 分析结构
    analyze_structure(content)
