const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 爬取豆瓣Top250页面
async function fetchDoubanTop250() {
  // 豆瓣Top250有25页，每页25条
  const movies = [];
  const baseUrl = 'https://movie.douban.com/top250';

  for (let i = 0; i < 25; i++) {
    const url = i === 0 ? baseUrl : `${baseUrl}?start=${i * 25}`;
    try {
      const res = await wx.cloud.callContainer({
        config: { env: cloud.DYNAMIC_CURRENT_ENV },
        path: '/proxy',
        method: 'GET',
        data: { url }
      });
      // 解析返回的HTML
      const html = res.data;
      const movieList = parseMoviesFromHtml(html, i * 25);
      movies.push(...movieList);
    } catch (err) {
      console.error(`抓取第${i + 1}页失败`, err);
    }
  }
  return movies;
}

// 从HTML解析电影信息
function parseMoviesFromHtml(html, startRank) {
  const movies = [];
  // 正则匹配电影信息 - 简化版解析
  const itemRegex = /<div class="item">[\s\S]*?<em class="">(\d+)<\/em>[\s\S]*?<img src="([^"]+)".*?<span class="title">([^<]+)<\/span>[\s\S]*?<span class="rating_num">([^<]+)<\/span>[\s\S]*?<span class="inq">([^<]+)<\/span>[\s\S]*?<br>\s*([^<]+)/g;

  let match;
  let rank = startRank;
  while ((match = itemRegex.exec(html)) !== null && rank < startRank + 25) {
    rank++;
    const poster = match[2];
    const title = match[3];
    const rating = parseFloat(match[4]);
    const quote = match[5] || '';
    const info = match[6] || '';

    // 解析导演、演员、上映时间等信息
    const parts = info.trim().split(/\s+\/\s+/);
    const director = parts[0] || '';
    const releaseDate = parts[1] || '';
    const genre = parts[2] ? parts[2].split('/') : [];
    const duration = parts[3] || '';
    const actors = parts.slice(4).join('/') || '';

    movies.push({
      rank,
      title,
      rating,
      poster,
      quote,
      director,
      releaseDate,
      genre,
      duration,
      actors
    });
  }
  return movies;
}

// 更新电影数据到数据库
async function updateMoviesToDb(movies, date) {
  const batchSize = 100;
  const movieCollection = db.collection('movies');

  // 先删除该日期的旧数据
  await movieCollection.where({ date }).remove();

  // 批量添加新数据
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const tasks = batch.map(movie => {
      return movieCollection.add({
        data: {
          ...movie,
          date,
          updatedAt: new Date()
        }
      });
    });
    await Promise.all(tasks);
  }
}

// 创建每日快照
async function createDailySnapshot(date, movieCount) {
  const snapshotCollection = db.collection('dailySnapshots');
  await snapshotCollection.doc(date).set({
    data: {
      date,
      movieCount,
      updatedAt: new Date()
    }
  });
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 可选：指定日期，默认今天
  const date = event.date || new Date().toISOString().split('T')[0];

  try {
    // 获取电影数据
    const movies = await fetchDoubanTop250();

    if (movies.length === 0) {
      return {
        success: false,
        error: '获取电影数据失败'
      };
    }

    // 更新到数据库
    await updateMoviesToDb(movies, date);
    await createDailySnapshot(date, movies.length);

    return {
      success: true,
      data: {
        date,
        count: movies.length
      }
    };
  } catch (err) {
    console.error('更新电影数据失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};