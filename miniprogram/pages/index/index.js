const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    movies: [],
    compareResult: null,
    selectedDate: '',
    yesterday: '',
    loading: true,
    showCompare: true
  },

  onLoad: function () {
    const today = util.formatDate(new Date());
    const yesterday = util.formatDate(new Date(Date.now() - 86400000));
    this.setData({
      selectedDate: today,
      yesterday
    });
    this.loadMovies();
    this.loadCompareResult();
  },

  onShow: function () {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  loadMovies: function (date) {
    const targetDate = date || this.data.selectedDate;
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getMovies',
      data: { date: targetDate },
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

  loadCompareResult: function () {
    const today = this.data.selectedDate;
    const yesterday = this.data.yesterday;

    wx.cloud.callFunction({
      name: 'compareList',
      data: { date1: yesterday, date2: today },
      success: res => {
        if (res.result.success) {
          this.setData({
            compareResult: res.result.data
          });
        }
      },
      fail: err => {
        console.error('获取比较结果失败', err);
      }
    });
  },

  onDateChange: function (e) {
    const date = e.detail.value;
    this.setData({ selectedDate: date });
    this.loadMovies(date);
  },

  goToMovieDetail: function (e) {
    const movieId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/movieDetail/movieDetail?id=${movieId}`
    });
  },

  goToHistory: function () {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  goToCompare: function () {
    wx.navigateTo({
      url: '/pages/compare/compare'
    });
  },

  toggleCompare: function () {
    this.setData({
      showCompare: !this.data.showCompare
    });
  },

  onPullDownRefresh: function () {
    this.loadMovies();
    this.loadCompareResult();
    wx.stopPullDownRefresh();
  }
});