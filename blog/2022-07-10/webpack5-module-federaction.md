---
slug: webpack5-module-federaction
title: Webpack5 Module Federaction
date: 2022-07-10T15:42
authors: [garfield]
tags: []
---

<!--truncate-->

Module Federation 注意事项

团队开发的流程是，front-ui 是公共组件库，业务逻辑开发都在这里进行，通过 mf 将模块远程共享给业务工程接入。在开发过程中发现，front-ui 开启 mf 后热更新（准确说应该是增量编译）变得很慢，同时控制台有很多警告信息，看了下 Webpack 文档，结合警告信息，判断应该是 `shared` 配置没有指定 `requiredVersion` 造成的。

官方文档有解释，如果没有指定版本号，则会根据 `package.json` 推断，但是 front-ui 是 monorepo 项目，不仅项目根目录有 `package.json`，每个子模块也有 `package.json`，自动推断无法正常工作，所以需要手动配置 `requiredVersion` 字段。

```js
const { ModuleFederationPlugin } = require('webpack').container;
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      // adds lodash as shared module
      // version is inferred from package.json
      // there is no version check for the required version
      // so it will always use the higher version found
      shared: ['lodash'],
    }),
  ],
};
```

> https://webpack.docschina.org/plugins/module-federation-plugin/#Specify-package-versions

[Module Federation最佳实践](https://mp.weixin.qq.com/s/pT_tugg_EvE5pnMCaUqliw)

[一文带你进入微前端世界](https://mp.weixin.qq.com/s/LL6VZj36PKftbwaybBFmXg)

[我们是怎么在项目中落地qiankun的](https://mp.weixin.qq.com/s/yu1tKtwneoTI9eSGS4us-g)

[模块联邦浅析](https://juejin.cn/post/7101457212085633054)

[【第2618期】手把手教你定制一套适合团队的微前端体系](https://mp.weixin.qq.com/s/ovwjufnPmCoYNLMkv5xv2g)

[【工程化】探索webpack5中的Module Federation](https://mp.weixin.qq.com/s/zt7x2KjMT_cWvLVVa2-Hww)
