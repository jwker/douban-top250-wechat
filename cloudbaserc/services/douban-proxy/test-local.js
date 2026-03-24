/**
 * 测试正则修复
 */

const http = require('http');
const https = require('https');

function fetchPage(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    };

    const req = httpModule.request(options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          fetchPage(redirectUrl, timeout).then(resolve).catch(reject);
          return;
        }
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('超时')); });
    req.end();
  });
}

function parseMovies(html, startRank) {
  const movies = [];

  // 新正则
  const itemRegex = /<div class="item">\s*<div class="pic">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- \/item -->/g;

  let itemMatch;
  let count = 0;
  while ((itemMatch = itemRegex.exec(html)) !== null) {
    count++;
    const itemHtml = itemMatch[0];
    const rank = startRank + count;

    const titleMatch = itemHtml.match(/<span class="title">([^<]+)<\/span>/);
    const title = titleMatch ? titleMatch[1].replace(/&nbsp;/g, ' ').trim() : '';

    const ratingMatch = itemHtml.match(/<span class="rating_num">([\d.]+)<\/span>/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    const posterMatch = itemHtml.match(/<img[^>]+src="([^"]+)"[^>]*>/);
    const poster = posterMatch ? posterMatch[1] : '';

    if (title) {
      movies.push({ rank, title, rating, poster });
    }
  }

  console.log(`正则匹配到 ${count} 个item，解析出 ${movies.length} 部电影`);

  if (movies.length > 0) {
    console.log('\n前5部:');
    movies.slice(0, 5).forEach(m => {
      console.log(`  ${m.rank}. ${m.title} - ${m.rating}`);
    });
  }

  return movies;
}

async function test() {
  const html = await fetchPage('http://movie.douban.com/top250');
  console.log('HTML长度:', html.length);

  parseMovies(html, 0);
}

test().catch(console.error);