App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-1gd5koldaeae55fc', // 替换为你的云环境ID
        traceUser: true,
      });
    }
    this.checkLogin();
  },

  globalData: {
    userInfo: null,
    openid: ''
  },

  checkLogin: function () {
    const that = this;
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        that.globalData.openid = res.result.openid;
        that.globalData.userInfo = res.result.userInfo;
      },
      fail: err => {
        console.error('登录失败', err);
      }
    });
  }
});