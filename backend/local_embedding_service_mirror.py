"""
本地Embedding服务 - Python版（使用国内镜像）
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import numpy as np
import json
import os

# 设置使用国内镜像
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'

app = Flask(__name__)
CORS(app)

MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'
cache = {}

print("=" * 60)
print("  本地Embedding服务 - Python版")
print("  使用镜像源: hf-mirror.com")
print("=" * 60)
print()

print(f"[INFO] 正在加载模型: {MODEL_NAME}")
print(f"[INFO] 使用镜像源: https://hf-mirror.com")

try:
    model = SentenceTransformer(MODEL_NAME)
    print(f"[OK] 模型加载成功!")
    print(f"   向量维度: {model.get_sentence_embedding_dimension()}")
except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    raise

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': MODEL_NAME,
        'cache_size': len(cache)
    })

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'text is required'}), 400
    
    cache_key = text[:100]
    if cache_key in cache:
        return jsonify({
            'embedding': cache[cache_key],
            'cached': True
        })
    
    embedding = model.encode(text, normalize_embeddings=True)
    embedding_list = embedding.tolist()
    cache[cache_key] = embedding_list
    
    return jsonify({
        'embedding': embedding_list,
        'cached': False
    })

if __name__ == '__main__':
    print()
    print("[INFO] 服务启动中...")
    print(f"[INFO] 监听端口: 5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
