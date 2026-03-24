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
    // 查找用户
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const user = userRes.data[0];
    const favorites = user.favorites || [];

    // 检查是否已收藏
    if (favorites.includes(movieId)) {
      return {
        success: true,
        message: '已收藏',
        data: { isFavorited: true }
      };
    }

    // 添加收藏
    favorites.push(movieId);
    await db.collection('users').doc(user._id).update({
      data: {
        favorites
      }
    });

    return {
      success: true,
      data: {
        isFavorited: true,
        favorites
      }
    };
  } catch (err) {
    console.error('添加收藏失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};