const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    movies: [],
    selectedDate: '',
    loading: true,
    availableDates: []
  },

  onLoad: function () {
    const today = util.formatDate(new Date());
    this.setData({ selectedDate: today });
    this.loadAvailableDates();
    this.loadMovies();
  },

  loadAvailableDates: function () {
    // 实际应该从数据库查询可用的日期列表
    // 这里模拟返回最近7天
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 86400000);
      dates.push(util.formatDate(date));
    }
    this.setData({ availableDates: dates });
  },

  loadMovies: function () {
    const { selectedDate } = this.data;
    if (!selectedDate) return;

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getMovies',
      data: { date: selectedDate },
      success: res => {
        if (res.result.success) {
          this.setData({
            movies: res.result.data,
            loading: false
          });
        }
      },
      fail: err => {
        console.error('获取电影列表失败', err);
        this.setData({ loading: false });
      }
    });
  },

  onDateChange: function (e) {
    const date = e.detail.value;
    this.setData({ selectedDate: date });
    this.loadMovies();
  },

  goToMovieDetail: function (e) {
    const movieId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/movieDetail/movieDetail?id=${movieId}`
    });
  },

  onPullDownRefresh: function () {
    this.loadMovies();
    wx.stopPullDownRefresh();
  }
});