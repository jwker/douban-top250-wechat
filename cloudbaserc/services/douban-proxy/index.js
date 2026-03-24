const http = require('http');

/**
 * 豆瓣Top250电影榜单爬虫
 * 适用于微信小程序云托管环境
 */

const PORT = process.env.PORT || 80;
const TOTAL_PAGES = 10; // 豆瓣Top250共10页，每页25部
const BASE_URL = 'https://movie.douban.com/top250';

// 缓存配置
let cachedMovies = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟

/**
 * 带重试的HTTP请求
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  const { timeout = 15000, headers = {} } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fetchPage(url, timeout, headers);
      return result;
    } catch (error) {
      if (attempt === retries) throw error;

      // 指数退避: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`请求失败，${delay}ms 后重试...`);
      await sleep(delay);
    }
  }
}

/**
 * 基础HTTP请求
 */
function fetchPage(url, timeout, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? require('https') : require('http');

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://movie.douban.com/',
        ...headers
      }
    };

    const req = httpModule.request(options, (res) => {
      // 处理重定向
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          resolve(fetchPage(redirectUrl, timeout, headers));
          return;
        }
      }

      // 检查被拦截
      if (res.statusCode === 403 || res.statusCode === 418) {
        reject(new Error(`请求被拦截: ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    req.setTimeout(timeout);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从HTML中提取电影条目列表
 */
function extractMovieItems(html) {
  const items = [];
  // 匹配每个电影条目
  const itemRegex = /<div class="item"(?:[^>]*)>([\s\S]*?)<\/div>\s*<\/div>\s*<!-- \/item -->/g;

  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    items.push(match[1]);
  }

  return items;
}

/**
 * 解析单个电影条目
 */
function parseMovieItem(itemHtml, rank) {
  const movie = { rank };

  // 提取排名
  const rankMatch = itemHtml.match(/<div class="pic">[\s\S]*?<em class="">(\d+)<\/em>/);
  if (rankMatch) {
    movie.rank = parseInt(rankMatch[1], 10);
  }

  // 提取标题（中文名）
  const titleMatch = itemHtml.match(/<span class="title">([^<]+)<\/span>/);
  movie.title = titleMatch ? titleMatch[1].replace(/&nbsp;/g, ' ').trim() : '';

  // 提取评分
  const ratingMatch = itemHtml.match(/<span class="rating_num">([\d.]+)<\/span>/);
  movie.rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

  // 提取海报URL
  const posterMatch = itemHtml.match(/<img[^>]+src="([^"]+)"[^>]*>/);
  movie.poster = posterMatch ? posterMatch[1] : '';

  // 提取引言
  const inqMatch = itemHtml.match(/<span class="inq">([^<]+)<\/span>/);
  movie.quote = inqMatch ? inqMatch[1].trim() : '';

  // 提取bd区块（包含导演、演员、年份等信息）
  const bdMatch = itemHtml.match(/<div class="bd">([\s\S]*?)<\/div>/);
  if (bdMatch) {
    const bdHtml = bdMatch[1];

    // 提取导演
    const directorMatch = bdHtml.match(/导演:\s*([^<]+)/);
    movie.director = directorMatch ? directorMatch[1].trim() : '';

    // 提取演员（取前3位）
    const actorMatch = bdHtml.match(/主演:\s*([^\n<]+)/);
    if (actorMatch) {
      const actorsRaw = actorMatch[1].split('/').map(s => s.trim()).filter(s => s);
      movie.actors = actorsRaw.slice(0, 3).join(' / ');
    } else {
      movie.actors = '';
    }

    // 提取年份、类型、时长
    const parts = bdHtml.split('/').map(s => s.trim()).filter(s => s);

    for (const part of parts) {
      // 年份
      const yearMatch = part.match(/(\d{4})/);
      if (yearMatch && !movie.year) {
        movie.year = yearMatch[1];
      }
      // 时长
      if (part.includes('分钟')) {
        movie.duration = part;
      }
    }

    // 提取类型
    const genreMatches = itemHtml.match(/<span class="genre">([^<]+)<\/span>/g);
    if (genreMatches) {
      movie.genre = genreMatches.map(g => g.replace(/<\/?span[^>]*>/g, '').trim());
    } else {
      movie.genre = [];
    }
  }

  // 构建豆瓣ID
  movie.doubanId = `douban_${movie.rank}`;

  return movie;
}

/**
 * 解析整页HTML
 */
function parsePage(html, startRank) {
  const items = extractMovieItems(html);
  const movies = [];

  for (const itemHtml of items) {
    const movie = parseMovieItem(itemHtml, startRank + movies.length + 1);
    if (movie.title) {
      movies.push(movie);
    }
  }

  return movies;
}

/**
 * 获取单页数据
 */
async function fetchPageData(pageIndex) {
  const url = pageIndex === 0 ? BASE_URL : `${BASE_URL}?start=${pageIndex * 25}`;
  console.log(`抓取第 ${pageIndex + 1}/${TOTAL_PAGES} 页: ${url}`);

  const html = await fetchWithRetry(url);

  // 检测验证码或被拦截
  if (html.includes('验证码') || html.includes('403 Forbidden') || html.includes('检测到异常')) {
    throw new Error('被豆瓣拦截，需要验证码或IP受限');
  }

  const movies = parsePage(html, pageIndex * 25);
  console.log(`第 ${pageIndex + 1} 页解析完成，获取 ${movies.length} 部电影`);

  return movies;
}

/**
 * 主函数：获取完整Top250榜单
 */
async function fetchDoubanTop250() {
  const now = Date.now();

  // 检查缓存
  if (cachedMovies && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('使用缓存数据');
    return cachedMovies;
  }

  const allMovies = [];
  let successCount = 0;

  for (let page = 0; page < TOTAL_PAGES; page++) {
    try {
      const movies = await fetchPageData(page);
      allMovies.push(...movies);
      successCount++;

      // 请求间隔，避免过快
      if (page < TOTAL_PAGES - 1) {
        await sleep(800 + Math.random() * 400);
      }
    } catch (error) {
      console.error(`第 ${page + 1} 页抓取失败:`, error.message);

      // 如果连续失败3页，可能网络有问题，停止抓取
      if (successCount === 0) {
        throw new Error(`连续抓取失败: ${error.message}`);
      }
    }
  }

  console.log(`抓取完成，共获取 ${allMovies.length} 部电影`);

  if (allMovies.length > 0) {
    cachedMovies = allMovies;
    lastFetchTime = now;
  }

  return allMovies;
}

/**
 * 清理缓存
 */
function clearCache() {
  cachedMovies = null;
  lastFetchTime = 0;
  console.log('缓存已清理');
}

// ==================== HTTP Server ====================

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // 健康检查
    if (url.pathname === '/health') {
      res.end(JSON.stringify({
        status: 'ok',
        cached: cachedMovies ? cachedMovies.length : 0,
        lastUpdate: lastFetchTime ? new Date(lastFetchTime).toISOString() : null
      }));
      return;
    }

    // 获取Top250数据
    if (url.pathname === '/douban' || url.pathname === '/movies' || url.pathname === '/') {
      const movies = await fetchDoubanTop250();
      res.end(JSON.stringify({
        success: true,
        data: movies,
        count: movies.length,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // 清理缓存
    if (url.pathname === '/clear-cache') {
      clearCache();
      res.end(JSON.stringify({ success: true, message: '缓存已清理' }));
      return;
    }

    // 获取单部电影（通过排名）
    const rankMatch = url.pathname.match(/^\/movie\/(\d+)$/);
    if (rankMatch) {
      const rank = parseInt(rankMatch[1], 10);
      if (!cachedMovies) {
        await fetchDoubanTop250();
      }
      const movie = cachedMovies.find(m => m.rank === rank);
      if (movie) {
        res.end(JSON.stringify({ success: true, data: movie }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: '电影不存在' }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: '未找到' }));
  } catch (error) {
    console.error('请求处理错误:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`豆瓣Top250代理服务启动，端口 ${PORT}`);
  console.log(`接口: GET /douban - 获取完整榜单`);
  console.log(`接口: GET /movie/{rank} - 获取单部电影`);
  console.log(`接口: GET /health - 健康检查`);
  console.log(`接口: GET /clear-cache - 清理缓存`);
});
