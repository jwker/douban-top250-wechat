const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    date1: '',
    date2: '',
    compareResult: null,
    loading: false,
    activeTab: 'new'
  },

  onLoad: function () {
    const today = util.formatDate(new Date());
    const yesterday = util.formatDate(new Date(Date.now() - 86400000));
    this.setData({
      date1: yesterday,
      date2: today
    });
  },

  onDate1Change: function (e) {
    this.setData({ date1: e.detail.value });
  },

  onDate2Change: function (e) {
    this.setData({ date2: e.detail.value });
  },

  compare: function () {
    const { date1, date2 } = this.data;
    if (!date1 || !date2) {
      wx.showToast({
        title: '请选择两个日期',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'compareList',
      data: { date1, date2 },
      success: res => {
        if (res.result.success) {
          this.setData({
            compareResult: res.result.data,
            loading: false
          });
        }
      },
      fail: err => {
        console.error('比较失败', err);
        this.setData({ loading: false });
      }
    });
  },

  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  goToMovieDetail: function (e) {
    const movieId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/movieDetail/movieDetail?id=${movieId}`
    });
  }
});