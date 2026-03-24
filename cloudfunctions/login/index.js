const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const db = cloud.database();
  const users = db.collection('users');

  // 查找用户是否已存在
  let userInfo = null;
  try {
    const result = await users.where({ openid }).get();
    if (result.data.length > 0) {
      userInfo = result.data[0];
    } else {
      // 创建新用户
      const now = new Date();
      const newUser = {
        openid,
        favorites: [],
        autoUpdateTime: '06:00',
        createdAt: now
      };
      await users.add({ data: newUser });
      userInfo = newUser;
    }
  } catch (err) {
    console.error('数据库操作失败', err);
  }

  return {
    openid,
    userInfo,
    success: true
  };
};