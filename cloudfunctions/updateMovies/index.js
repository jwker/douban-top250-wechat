const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const https = require('https');

// 云托管服务地址（部署后在云托管控制台获取）
const PROXY_SERVICE_URL = 'douban-237759-9-1408821318.sh.run.tcloudbase.com';

// 通过云托管代理获取豆瓣数据
async function fetchDoubanTop250() {
  return new Promise((resolve, reject) => {
    const url = `https://${PROXY_SERVICE_URL}/douban`;

    console.log('请求云托管代理:', url);

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            resolve(result.data);
          } else {
            reject(new Error(result.error || '获取数据失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败: ' + e.message));
        }
      });
    }).on('error', (err) => {
      console.error('HTTPS请求失败:', err);
      reject(err);
    });
  });
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
  // 设置云函数超时时间为300秒（5分钟）
  context.timeout = 300;

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 可选：指定日期，默认今天
  const date = event.date || new Date().toISOString().split('T')[0];

  try {
    // 通过云托管代理获取电影数据
    console.log('开始获取豆瓣Top250数据...');
    const movies = await fetchDoubanTop250();

    if (!movies || movies.length === 0) {
      return {
        success: false,
        error: '获取电影数据失败'
      };
    }

    console.log(`获取到 ${movies.length} 部电影`);

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