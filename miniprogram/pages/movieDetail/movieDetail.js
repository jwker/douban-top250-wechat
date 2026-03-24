const app = getApp();

Page({
  data: {
    movie: null,
    isFavorited: false,
    loading: true
  },

  onLoad: function (options) {
    const { id } = options;
    if (id) {
      this.loadMovieDetail(id);
    }
  },

  loadMovieDetail: function (movieId) {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getMovieDetail',
      data: { movieId },
      success: res => {
        if (res.result.success) {
          this.setData({
            movie: res.result.data,
            isFavorited: res.result.data.isFavorited,
            loading: false
          });
        }
      },
      fail: err => {
        console.error('获取电影详情失败', err);
        this.setData({ loading: false });
      }
    });
  },

  toggleFavorite: function () {
    const movie = this.data.movie;
    const movieId = movie._id;

    if (this.data.isFavorited) {
      // 取消收藏
      wx.cloud.callFunction({
        name: 'removeFavorite',
        data: { movieId },
        success: res => {
          if (res.result.success) {
            this.setData({ isFavorited: false });
            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            });
          }
        },
        fail: err => {
          console.error('取消收藏失败', err);
        }
      });
    } else {
      // 添加收藏
      wx.cloud.callFunction({
        name: 'addFavorite',
        data: { movieId },
        success: res => {
          if (res.result.success) {
            this.setData({ isFavorited: true });
            wx.showToast({
              title: '收藏成功',
              icon: 'success'
            });
          }
        },
        fail: err => {
          console.error('添加收藏失败', err);
        }
      });
    }
  },

  onShareAppMessage: function () {
    const movie = this.data.movie;
    return {
      title: `《${movie.title}》 - 豆瓣Top250`,
      path: `/pages/movieDetail/movieDetail?id=${movie._id}`
    };
  }
});