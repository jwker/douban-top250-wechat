const http = require('http');

/**
 * 豆瓣Top250数据获取代理服务
 * 使用原生http模块，避免第三方库兼容性问题
 */

const PORT = process.env.PORT || 80;

// 获取单个页面数据
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

// 解析电影信息
function parseMovies(html, startRank) {
  const movies = [];

  // 使用正则提取每个电影条目
  const itemRegex = /<div class="item">([\s\S]*?)<\/div>\s*<\/div>\s*<!--\/item-->/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(html)) !== null) {
    const itemHtml = itemMatch[1];
    const rank = ++startRank;

    // 提取标题
    const titleMatch = itemHtml.match(/<span class="title">([^<]+)<\/span>/);
    const title = titleMatch ? titleMatch[1] : '';

    // 提取评分
    const ratingMatch = itemHtml.match(/<span class="rating_num">([\d.]+)<\/span>/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // 提取海报
    const posterMatch = itemHtml.match(/<img[^>]+src="([^"]+)"[^>]*>/);
    const poster = posterMatch ? posterMatch[1] : '';

    // 提取引言
    const quoteMatch = itemHtml.match(/<span class="inq">([^<]+)<\/span>/);
    const quote = quoteMatch ? quoteMatch[1] : '';

    // 提取信息行
    const infoMatch = itemHtml.match(/<p class="">([\s\S]*?)<\/p>\s*<div class="bd">/);
    const infoText = infoMatch ? infoMatch[1] : '';

    // 清理HTML标签
    const cleanText = infoText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // 解析导演、演员等信息
    let director = '';
    let actors = '';
    let releaseDate = '';
    let genre = '';
    let duration = '';

    // 分割信息
    const parts = cleanText.split('/').map(s => s.trim()).filter(s => s);

    if (parts.length > 0) {
      // 第一部分通常是导演
      director = parts[0].replace('导演:', '').trim();
    }

    if (parts.length > 1) {
      // 找演员（包含主演的）
      const actorPart = parts.find(p => p.includes('主演'));
      if (actorPart) {
        actors = actorPart.replace('主演:', '').split('/').slice(0, 3).join('/');
      }
    }

    // 从所有部分中提取年份、类型、时长
    parts.forEach(part => {
      if (/\d{4}/.test(part)) {
        releaseDate = part;
      } else if (part.includes('分钟')) {
        duration = part;
      } else if (part.length < 20 && !part.includes('主演')) {
        genre = genre ? `${genre}/${part}` : part;
      }
    });

    if (title) {
      movies.push({
        rank,
        title,
        rating,
        director,
        actors,
        releaseDate,
        genre: genre ? genre.split('/') : [],
        duration,
        poster,
        quote,
        doubanId: `douban_${rank}`
      });
    }
  }

  return movies;
}

// 获取豆瓣Top250所有数据
async function fetchDoubanTop250() {
  const allMovies = [];
  const baseUrl = 'https://movie.douban.com/top250';

  console.log('开始获取豆瓣Top250数据...');

  for (let page = 0; page < 25; page++) {
    const url = page === 0 ? baseUrl : `${baseUrl}?start=${page * 25}`;

    try {
      console.log(`抓取第 ${page + 1}/25 页...`);
      const html = await fetchPage(url);
      const movies = parseMovies(html, page * 25);
      allMovies.push(...movies);

      // 延迟1秒，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`抓取第 ${page + 1} 页失败:`, error.message);
    }
  }

  console.log(`共获取 ${allMovies.length} 部电影`);
  return allMovies;
}

// HTTP服务器
const server = http.createServer(async (req, res) => {
  // CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 健康检查
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // 获取数据
  if (url.pathname === '/douban' || url.pathname === '/') {
    try {
      const movies = await fetchDoubanTop250();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: movies,
        count: movies.length,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('获取数据失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`豆瓣代理服务运行在端口 ${PORT}`);
});