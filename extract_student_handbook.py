#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
学生手册PDF提取工具
设计师：内师智能体系统
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pdfplumber
import json
from pathlib import Path

def extract_pdf_structure(pdf_path):
    """提取PDF的结构和内容"""
    print(f"正在读取PDF文件：{pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        print(f"\n✓ PDF信息：")
        print(f"  - 总页数：{len(pdf.pages)}")

        # 提取元数据
        if pdf.metadata:
            print(f"  - 元数据：{pdf.metadata}")

        # 提取目录结构（尝试识别章节）
        print(f"\n✓ 正在提取内容...")

        content = {
            "total_pages": len(pdf.pages),
            "pages": []
        }

        # 先提取前几页看看结构
        for i, page in enumerate(pdf.pages[:20]):  # 先看前20页
            text = page.extract_text()
            if text:
                content["pages"].append({
                    "page_num": i + 1,
                    "text": text
                })
                print(f"  - 第{i+1}页：{len(text)}字符")

        return content

def main():
    pdf_path = r"E:\外包\教育系统智能体\相关文档\2025年本科学生手册-定 (1).pdf"
    output_path = r"E:\外包\教育系统智能体\student_handbook_extracted.json"

    # 提取内容
    content = extract_pdf_structure(pdf_path)

    # 保存为JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 提取完成！已保存到：{output_path}")

    # 显示第一页内容预览
    if content["pages"]:
        print(f"\n✓ 第1页内容预览：")
        print("=" * 80)
        print(content["pages"][0]["text"][:500])
        print("=" * 80)

if __name__ == "__main__":
    main()
