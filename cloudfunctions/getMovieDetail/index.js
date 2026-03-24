const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { movieId } = event;

  if (!movieId) {
    return {
      success: false,
      error: '缺少电影ID'
    };
  }

  const db = cloud.database();

  try {
    // 获取电影详情
    const movieRes = await db.collection('movies').doc(movieId).get();

    if (!movieRes.data) {
      return {
        success: false,
        error: '电影不存在'
      };
    }

    // 检查用户是否已收藏
    const userRes = await db.collection('users').where({ openid }).get();
    let isFavorited = false;
    if (userRes.data.length > 0) {
      const favorites = userRes.data[0].favorites || [];
      isFavorited = favorites.includes(movieId);
    }

    return {
      success: true,
      data: {
        ...movieRes.data,
        isFavorited
      }
    };
  } catch (err) {
    console.error('获取电影详情失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};