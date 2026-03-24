// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 获取昨天的日期
function getYesterday() {
  return formatDate(new Date(Date.now() - 86400000));
}

// 获取今天的日期
function getToday() {
  return formatDate(new Date());
}

module.exports = {
  formatDate,
  getYesterday,
  getToday
};