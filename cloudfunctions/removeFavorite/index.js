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

    // 移除收藏
    const index = favorites.indexOf(movieId);
    if (index > -1) {
      favorites.splice(index, 1);
    }

    await db.collection('users').doc(user._id).update({
      data: {
        favorites
      }
    });

    return {
      success: true,
      data: {
        isFavorited: false,
        favorites
      }
    };
  } catch (err) {
    console.error('移除收藏失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};