# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

微信小程序云开发项目，实现豆瓣电影Top250榜单查询功能。

## 技术栈

- **前端**: 微信小程序 + WXML/WXSS/JS
- **后端**: 微信云开发 (云函数、云数据库)
- **数据源**: 云函数爬取豆瓣Top250页面

## 项目结构

```
├── cloudfunctions/          # 云函数目录
│   ├── login/               # 无感登录
│   ├── getMovies/           # 获取电影列表
│   ├── getMovieDetail/      # 获取电影详情
│   ├── updateMovies/        # 更新电影数据(爬虫)
│   ├── compareList/         # 榜单比较
│   ├── addFavorite/         # 添加收藏
│   ├── removeFavorite/      # 移除收藏
│   ├── getFavorites/        # 获取收藏列表
│   └── setAutoUpdateTime/  # 设置自动更新时间
├── miniprogram/            # 小程序主目录
│   ├── pages/
│   │   ├── index/          # 首页
│   │   ├── movieDetail/    # 电影详情
│   │   ├── favorites/      # 收藏列表
│   │   ├── history/        # 历史榜单
│   │   ├── compare/        # 榜单比较
│   │   └── settings/       # 设置
│   ├── utils/              # 工具函数
│   └── assets/icons/       # tabBar图标(需自行添加)
├── cloudbaserc.json        # 云开发配置
└── project.config.json     # 项目配置
```

## 数据库集合

- **movies**: 电影数据 (按date字段区分不同日期榜单)
- **users**: 用户信息 (openid, favorites, autoUpdateTime)
- **dailySnapshots**: 每日榜单快照

## 云函数说明

| 云函数 | 功能 |
|--------|------|
| login | 获取openid，创建/更新用户记录 |
| getMovies | 获取指定日期的电影列表 |
| getMovieDetail | 获取电影详情和收藏状态 |
| updateMovies | 爬取豆瓣Top250数据并存储 |
| compareList | 比较两个日期的榜单差异 |
| addFavorite/removeFavorite | 收藏管理 |
| getFavorites | 获取用户收藏列表 |
| setAutoUpdateTime | 设置自动更新时间 |

## 开发要点

1. **tabBar图标**: 需在 `miniprogram/assets/icons/` 添加4个PNG图标:
   - home.png / home-active.png
   - star.png / star-active.png
   - settings.png / settings-active.png

2. **云环境ID**: 需在以下文件中替换为实际云环境ID:
   - `miniprogram/app.js` 中的 env
   - `cloudbaserc.json` 中的 envId
   - `project.config.json` 中的 appid

3. **updateMovies云函数**: 包含HTML解析逻辑，实际部署可能需要使用云托管或调整抓取策略

## 微信开发者工具使用

1. 打开微信开发者工具，导入项目
2. 确保云开发环境已开通
3. 上传所有云函数
4. 在云控制台创建数据库集合: movies, users, dailySnapshots
5. 可手动调用updateMovies云函数初始化数据