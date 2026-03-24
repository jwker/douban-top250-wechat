const app = getApp();

Page({
  data: {
    favorites: [],
    loading: true
  },

  onLoad: function () {
    this.loadFavorites();
  },

  onShow: function () {
    this.loadFavorites();
  },

  loadFavorites: function () {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getFavorites',
      success: res => {
        if (res.result.success) {
          this.setData({
            favorites: res.result.data,
            loading: false
          });
        }
      },
      fail: err => {
        console.error('获取收藏失败', err);
        this.setData({ loading: false });
      }
    });
  },

  goToMovieDetail: function (e) {
    const movieId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/movieDetail/movieDetail?id=${movieId}`
    });
  },

  removeFavorite: function (e) {
    const movieId = e.currentTarget.dataset.id;
    const that = this;

    wx.showModal({
      title: '确认取消',
      content: '确定要取消收藏这部电影吗？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'removeFavorite',
            data: { movieId },
            success: res => {
              if (res.result.success) {
                that.loadFavorites();
                wx.showToast({
                  title: '已取消收藏',
                  icon: 'success'
                });
              }
            }
          });
        }
      }
    });
  },

  onPullDownRefresh: function () {
    this.loadFavorites();
    wx.stopPullDownRefresh();
  }
});