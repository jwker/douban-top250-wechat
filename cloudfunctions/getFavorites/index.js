const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const db = cloud.database();

  try {
    // 查找用户
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const user = userRes.data[0];
    const favorites = user.favorites || [];

    if (favorites.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // 获取收藏的电影详情
    const movieRes = await db.collection('movies')
      .where({
        _id: db.command.in(favorites)
      })
      .get();

    return {
      success: true,
      data: movieRes.data
    };
  } catch (err) {
    console.error('获取收藏失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};