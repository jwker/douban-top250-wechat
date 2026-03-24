const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { date } = event;

  // 获取日期，默认今天
  const targetDate = date || new Date().toISOString().split('T')[0];

  const db = cloud.database();
  const _ = db.command;

  try {
    // 从 movies 集合获取该日期的电影列表
    const result = await db.collection('movies')
      .where({ date: targetDate })
      .orderBy('rank', 'asc')
      .limit(250)
      .get();

    return {
      success: true,
      data: result.data,
      date: targetDate
    };
  } catch (err) {
    console.error('获取电影列表失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};