const app = getApp();

Page({
  data: {
    autoUpdateTime: '06:00',
    userInfo: null,
    loading: false
  },

  onLoad: function () {
    this.loadUserSettings();
  },

  onShow: function () {
    const userInfo = app.globalData.userInfo;
    if (userInfo && userInfo.autoUpdateTime) {
      this.setData({
        autoUpdateTime: userInfo.autoUpdateTime,
        userInfo
      });
    }
  },

  loadUserSettings: function () {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        autoUpdateTime: userInfo.autoUpdateTime || '06:00',
        userInfo
      });
    }
  },

  onTimeChange: function (e) {
    const time = e.detail.value;
    this.setData({ autoUpdateTime: time });
  },

  saveAutoUpdateTime: function () {
    const { autoUpdateTime } = this.data;

    wx.cloud.callFunction({
      name: 'setAutoUpdateTime',
      data: { time: autoUpdateTime },
      success: res => {
        if (res.result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        }
      },
      fail: err => {
        console.error('保存设置失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },

  manualUpdate: function () {
    const that = this;
    wx.showModal({
      title: '确认手动更新',
      content: '确定要立即更新电影榜单数据吗？',
      success: res => {
        if (res.confirm) {
          that.setData({ loading: true });
          wx.showLoading({ title: '更新中...' });

          wx.cloud.callFunction({
            name: 'updateMovies',
            success: res => {
              wx.hideLoading();
              that.setData({ loading: false });

              if (res.result.success) {
                wx.showToast({
                  title: '更新成功',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: res.result.error || '更新失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              wx.hideLoading();
              that.setData({ loading: false });
              wx.showToast({
                title: '更新失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
});