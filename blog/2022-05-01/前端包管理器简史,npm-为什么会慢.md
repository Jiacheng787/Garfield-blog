---
slug: 前端包管理器简史,npm-为什么会慢
title: 前端包管理器简史,npm 为什么会慢
date: 2022-05-01T23:28
description: This is my first post on Docusaurus 2.
authors: [garfield]
tags: []
---

<!--truncate-->

**npm@v3 之前**

- 嵌套结构（nest），会出现大量重复装包的问题
- 因为是树型结构，`node_modules` 嵌套层级过深，导致文件路径过长
- 模块实例不能共享，例如在两个不同包引入的 React 不是同一个模块实例

**npm@v3 / yarn**

- 分身依赖：npm@v3 使用扁平化（flat）的方式安装依赖，一定程度上解决了重复装包的问题，但是注意并没有完全解决，例如 A 和 B 依赖了不同版本的 C，会导致 C 被安装两次
- 幽灵依赖：由于使用扁平化方式安装，`package.json` 里并没有写入的包竟然也可以在项目中使用了
- 平铺减少安装没有减省时间，因为扁平化算法比较复杂，时间居然还增加了

**npm@v5 / yarn**

该版本引入了一个 `lock` 文件，以解决 `node_modules` 安装中的不确定因素。这使得无论你安装多少次，都能有一个一样结构的`node_modules`。

然而，平铺式的算法的复杂性，幽灵依赖之类的问题还是没有解决。

[看了9个开源的 Vue3 组件库，发现了这些前端的流行趋势](https://juejin.cn/post/7092766235380678687)

[深入浅出 tnpm rapid 模式 - 如何比 pnpm 快 10 秒](https://zhuanlan.zhihu.com/p/455809528)

[pnpm 源码结构及调试指南](https://mp.weixin.qq.com/s/grb2OlBYiwU3TOkEtNZReA)

[【第2506期】JavaScript 包管理器简史（npm/yarn/pnpm）](https://mp.weixin.qq.com/s/0Nx093GdMcYo5Mr5VRFDjw)
