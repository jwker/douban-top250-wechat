#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
豆瓣Top250数据获取代理服务
使用Flask框架
"""

from flask import Flask, jsonify, Response
import re
import urllib.request
import json
import time

app = Flask(__name__)

# 缓存
cached_movies = None
last_fetch_time = 0
CACHE_DURATION = 30 * 60  # 30分钟

def fetch_page(url, timeout=15):
    """获取页面HTML"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"请求失败: {e}")
        return None

def parse_movies(html, start_rank=0):
    """解析电影列表"""
    movies = []

    # 匹配每个电影条目
    # 格式: <div class="item">...<em>排名</em>...<span class="title">标题</span>...<span class="rating_num">评分</span>...</div>
    pattern = r'<div class="item">.*?<em>(\d+)</em>.*?<img[^>]+src="([^"]+)"[^>]*>.*?<span class="title">([^<]+)</span>.*?<span class="rating_num">([\d.]+)</span>.*?<span class="inq">([^<]+)</span>.*?<br>(.*?)</div>'

    matches = re.findall(pattern, html, re.DOTALL)

    print(f"找到 {len(matches)} 个匹配")

    for match in matches:
        rank = int(match[0])
        poster = match[1]
        title = match[2].replace('&nbsp;', ' ').strip()
        rating = float(match[3])
        quote = match[4].strip() if match[4] else ''
        info_text = match[5].strip()

        # 解析info
        director = ''
        actors = ''
        release_date = ''
        genre = ''
        duration = ''

        parts = [p.strip() for p in info_text.split('/') if p.strip()]

        if parts:
            # 第一部分是导演
            director = parts[0].replace('导演:', '').replace('主演:', '').strip()

        for part in parts:
            if '主演' in part:
                actors = part.replace('主演:', '').split('/')[0].strip()
            elif '分钟' in part:
                duration = part.strip()
            elif re.search(r'\d{4}', part):
                release_date = part.strip()
            elif len(part) < 15 and not '导演' in part:
                genre = part.strip()

        movies.append({
            'rank': rank,
            'title': title,
            'rating': rating,
            'director': director,
            'actors': actors,
            'releaseDate': release_date,
            'genre': [genre] if genre else [],
            'duration': duration,
            'poster': poster,
            'quote': quote,
            'doubanId': f'douban_{rank}'
        })

    return movies

def fetch_douban_top250():
    """获取完整Top250"""
    global cached_movies, last_fetch_time

    now = time.time()

    # 检查缓存
    if cached_movies and (now - last_fetch_time) < CACHE_DURATION:
        print('使用缓存')
        return cached_movies

    all_movies = []
    base_url = 'https://movie.douban.com/top250'

    print('开始抓取...')

    for page in range(25):
        url = base_url if page == 0 else f'{base_url}?start={page * 25}'

        try:
            print(f'第 {page + 1}/25...')
            html = fetch_page(url)

            if html:
                if '验证码' in html or '403' in html:
                    print('被拦截，等待...')
                    time.sleep(3)
                    continue

                movies = parse_movies(html, page * 25)
                print(f'第 {page + 1} 页: {len(movies)} 部')
                all_movies.extend(movies)

            time.sleep(0.5)

        except Exception as e:
            print(f'第 {page + 1} 页失败: {e}')

    print(f'共 {len(all_movies)} 部')

    if all_movies:
        cached_movies = all_movies
        last_fetch_time = now

    return all_movies

@app.route('/health')
def health():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'cached': len(cached_movies) if cached_movies else 0,
        'time': time.strftime('%Y-%m-%dT%H:%M:%SZ')
    })

@app.route('/douban')
@app.route('/')
def get_movies():
    """获取电影列表"""
    try:
        movies = fetch_douban_top250()
        return jsonify({
            'success': True,
            'data': movies,
            'count': len(movies),
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        })
    except Exception as e:
        print(f'失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)