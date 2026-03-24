const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { date1, date2 } = event;

  if (!date1 || !date2) {
    return {
      success: false,
      error: '请提供两个日期进行比较'
    };
  }

  const db = cloud.database();

  try {
    // 获取两个日期的电影列表
    const [list1, list2] = await Promise.all([
      db.collection('movies').where({ date: date1 }).field({ doubanId: true, rank: true, title: true, rating: true, poster: true }).get(),
      db.collection('movies').where({ date: date2 }).field({ doubanId: true, rank: true, title: true, rating: true, poster: true }).get()
    ]);

    const movies1 = list1.data;
    const movies2 = list2.data;

    // 转换为map方便比较
    const map1 = new Map(movies1.map(m => [m.doubanId || m.title, m]));
    const map2 = new Map(movies2.map(m => [m.doubanId || m.title, m]));

    // 计算新晋榜单（在date2但不在date1）
    const newMovies = movies2.filter(m => {
      const key = m.doubanId || m.title;
      return !map1.has(key);
    }).map(m => ({ ...m, newRank: m.rank }));

    // 计算跌出榜单（在date1但不在date2）
    const removedMovies = movies1.filter(m => {
      const key = m.doubanId || m.title;
      return !map2.has(key);
    }).map(m => ({ ...m, oldRank: m.rank }));

    // 计算排名变化
    const rankChanged = [];
    movies2.forEach(m2 => {
      const key = m2.doubanId || m2.title;
      const m1 = map1.get(key);
      if (m1 && m1.rank !== m2.rank) {
        rankChanged.push({
          ...m2,
          oldRank: m1.rank,
          newRank: m2.rank,
          change: m1.rank - m2.rank // 正数表示上升，负数表示下降
        });
      }
    });

    // 按变化排序
    rankChanged.sort((a, b) => b.change - a.change);

    return {
      success: true,
      data: {
        date1,
        date2,
        newMovies,
        removedMovies,
        rankChanged
      }
    };
  } catch (err) {
    console.error('比较榜单失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};