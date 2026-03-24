# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

微信小程序云开发项目，实现豆瓣电影Top250榜单查询功能。

## 技术架构

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────┐
│   小程序        │         │  云托管 (HTTP服务)     │         │  豆瓣网站   │
│   前端          │  调用    │  douban-proxy         │  访问    │  movie.     │
│                │ ──────► │  (部署在腾讯云)        │ ──────► │  douban.com │
└─────────────────┘         └──────────────────────┘         └─────────────┘
        │                            │
        │                            │ 可以访问外网
        │   云函数(定时触发)           │
        │ ─────────────────────────► │
        │                            │
        ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      云数据库                                │
│   movies / users / dailySnapshots                          │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

- **前端**: 微信小程序 + WXML/WXSS/JS
- **后端**: 微信云开发 (云函数、云数据库)
- **代理服务**: 云托管 (CloudBase Run) - Node.js + Express

## 项目结构

```
├── cloudfunctions/          # 云函数目录
│   ├── login/               # 无感登录
│   ├── getMovies/           # 获取电影列表
│   ├── getMovieDetail/      # 获取电影详情
│   ├── updateMovies/        # 更新电影数据（调用云托管）
│   ├── compareList/         # 榜单比较
│   ├── addFavorite/         # 添加收藏
│   ├── removeFavorite/      # 移除收藏
│   ├── getFavorites/        # 获取收藏列表
│   └── setAutoUpdateTime/  # 设置自动更新时间
├── cloudbaserc/
│   └── services/
│       └── douban-proxy/   # 云托管代理服务
│           ├── index.js    # Express服务
│           └── package.json
├── miniprogram/            # 小程序主目录
│   ├── pages/
│   │   ├── index/          # 首页
│   │   ├── movieDetail/    # 电影详情
│   │   ├── favorites/      # 收藏列表
│   │   ├── history/       # 历史榜单
│   │   ├── compare/       # 榜单比较
│   │   └── settings/      # 设置
│   ├── utils/             # 工具函数
│   └── assets/icons/      # tabBar图标(需自行添加)
├── cloudbaserc.json        # 云开发+云托管配置
└── project.config.json     # 项目配置
```

## 数据库集合

| 集合名 | 说明 |
|--------|------|
| movies | 电影数据 (按date字段区分不同日期榜单) |
| users | 用户信息 (openid, favorites, autoUpdateTime) |
| dailySnapshots | 每日榜单快照 |

## 云函数说明

| 云函数 | 功能 |
|--------|------|
| login | 获取openid，创建/更新用户记录 |
| getMovies | 获取指定日期的电影列表 |
| getMovieDetail | 获取电影详情和收藏状态 |
| updateMovies | 调用云托管获取豆瓣Top250数据并存入数据库 |
| compareList | 比较两个日期的榜单差异 |
| addFavorite/removeFavorite | 收藏管理 |
| getFavorites | 获取用户收藏列表 |
| setAutoUpdateTime | 设置自动更新时间 |

## 部署步骤

### 1. 部署云托管服务（代理）

```bash
# 进入代理服务目录
cd cloudbaserc/services/douban-proxy

# 安装依赖
npm install

# 使用腾讯云CLI部署（需要先配置密钥）
tcb service deploy douban-proxy
```

或者在微信开发者工具中：
- 打开「云开发控制台」→「云托管」→「新建服务」
- 选择「使用代码仓库」或「手动上传」

### 2. 获取云托管服务地址

部署成功后，在云托管控制台获取服务地址，如：
```
https://douban-proxy-xxxxx.ap-shanghai.app.tcloudbase.com/douban
```

### 3. 更新云函数配置

修改 `cloudfunctions/updateMovies/index.js` 中的 `PROXY_SERVICE_URL` 为实际地址。

### 4. 上传云函数

在微信开发者工具中右键「cloudfunctions」文件夹，上传并部署所有云函数。

### 5. 创建数据库集合

在云开发控制台创建以下集合：
- `movies`
- `users`
- `dailySnapshots`

### 6. 配置定时触发器

在云开发控制台「云函数」→「定时触发器」中配置：
- 函数名：`updateMovies`
- 触发周期：每天指定时间（如 06:00）

## tabBar图标

需在 `miniprogram/assets/icons/` 添加4个PNG图标（81x81像素）：
- home.png / home-active.png
- star.png / star-active.png
- settings.png / settings-active.png

## 注意事项

1. 云函数无法直接访问外部网络，必须通过云托管代理
2. 云托管有免费调用额度
3. 豆瓣网站可能有反爬措施，云托管服务中已添加请求头模拟浏览器
4. 如果豆瓣页面结构变化，可能需要更新云托管服务的解析逻辑