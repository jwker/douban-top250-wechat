const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { time } = event;

  if (!time) {
    return {
      success: false,
      error: '缺少时间参数'
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

    // 更新自动更新时间
    await db.collection('users').doc(userRes.data[0]._id).update({
      data: {
        autoUpdateTime: time
      }
    });

    return {
      success: true,
      data: {
        autoUpdateTime: time
      }
    };
  } catch (err) {
    console.error('设置自动更新时间失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};