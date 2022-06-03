---
slug: vite-打包-react-组件库
title: Vite 打包 React 组件库
date: 2022-05-20T21:43
authors: [garfield]
tags: []
---

<!--truncate-->

## 为什么用 Vite 打包 React 组件库

- 生产环境 rollup 打包 + 开发环境 devServer
- 官方提供 `@vitejs/plugin-react` 插件，支持开发环境 fast-refresh，支持类组件 Class Properties 语法转换
- 生产环境默认使用 esbuild 代码压缩，效率是 terser 的 20-40 倍
- esbuild 在语法转换这块尚不完善，但是组件库打包不用考虑兼容性问题，兼容性问题交给业务项目解决
- Vite 提供了很多 esbuild 尚不支持的特性（例如 CSS 模块化等）
- 开发环境和生产环境几乎可以复用一套配置（Vite 抹平了 esbulid 和 rollup 配置差异）

## 组件库打包注意点

### 1) 依赖外部化

打包一个 React 组件库，在该组件库中用到了 antd，而使用该组件库的业务项目同样也依赖了 React 和 antd，这种情况下 React 和 antd 就可以作为组件库的 peerDependencies，不打包进去（即依赖外部化）。

所谓依赖外部化，是指通过配置 `external` 选项，在打包的时候跳过模块解析，进而在构建产物中保留 `import` 语句，由业务项目引入该库的时候再统一打包。这样做的好处就是可以减少模块冗余，防止业务项目的构建产物存在多份同样的代码。但是这样就需要确保组件库的 peerDependencies 与目标环境安装依赖版本兼容性，防止组件库接入业务项目的时候因为依赖库版本不兼容而报错。

### 2) 合理分包

为什么要分包？一句话总结：减少 chunk 资源冗余，提升缓存复用率。

## 如何学习 Vite 配置

如果有些 Vite 配置不知道怎么写，文档也没有详细说明（特别是一些 rollup 的配置），这时候可以参考下 Vite 官方的 playground，给了非常详尽的 demo：

https://github.com/vitejs/vite/tree/main/playground

## Vite 存在哪些问题

### 1) 官方汇总的 issue

https://github.com/vitejs/vite/discussions/8232

### 2) 生态尚不完善

awesome-vite 上面很多插件都是个人开发，没有专门的团队维护，一堆陈年的 issue 都没处理。但是官方提供的插件又太少，难以满足复杂业务场景需要。
