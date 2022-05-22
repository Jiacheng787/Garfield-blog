---
slug: 使用cra搭建react+ts项目
title: 使用CRA搭建React+TS项目
date: 2022-04-30T21:37
authors: [garfield]
tags: []
---

<!--truncate-->

## CRA 项目非跟路径部署的正确姿势

项目中需要使用一个子路径部署页面，例如 `/tclient`。此时 HTML 入口文件中所有的资源地址都要改成从 `/tclient` 路径下去访问。

对于前端项目来说，在非跟路径下部署，主要有三个地方要改：

- 前端路由 `basename`
- Webpack 的 `output.publicPath`（Webpack 打包的静态资源前缀）
- public 目录下资源的引用路径（该目录下资源不会被 Webpack 处理，会直接复制到 build 目录下，然后在 HTML 入口文件直接引用）

### 1) 修改前端路由 basename

首先前端路由这边很好改：

```tsx {6} title="src/App.tsx"
import * as React from "react";
import { BrowserRouter } from "react-router-dom";

const App: React.FC<{}> = () => {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Index />
    </BrowserRouter>
  );
}

export default App;
```

然后添加环境变量：

```bash title=".env.production"
# 生产环境使用 /tclient
PUBLIC_URL=/tclient
```

```bash title=".env.development"
# 开发环境还是根路径访问
PUBLIC_URL=/
```

> 注意这里的 `PUBLIC_URL` 是 CRA 内置的环境变量，下面会讲到

### 2) 修改 Webpack 的 `output.publicPath`

对于 Webpack 打包的资源，由于带有哈希，需要通过 HtmlWebpackPlugin 帮我们引入 HTML 入口文件。

在非跟路径部署的时候，只需要在资源路径前面，加上 **静态资源前缀** 就可以了，对应的就是 `output.publicPath` 配置项。

由于 CRA 不支持自定义 Webpack 配置，因此之前一直用 react-app-rewired + customize-cra 修改 Webpack 配置。结果看了下 customize-cra 的文档，竟然没有修改 `publicPath` 的配置函数。看了 customize-cra 源码，好在它那些配置函数并不是很复杂，其实就是一个管道操作而已，跟 webpack-chain 异曲同工：

> https://github.com/arackaf/customize-cra/blob/master/src/customizers/webpack.js

于是参考 customize-cra 配置函数，自己写了个修改 `publicPath` 的配置函数：

```js
const setPublicPath = (path = "/") => config => {
  config.output.publicPath = path;
  return config;
}
```

这样配置之后，打个包看下 Webpack 处理的静态资源，确实都加上了 `/tclient` 前缀，但是 public 目录下的资源都还是根路径引用。

### 3) 修改 public 目录下资源引用路径

通常使用 Webpack 打包 JS、CSS、图片、字体等资源，作用如下：

- 语法转换、编译兼容、代码优化等
- 多个模块打包为一个 chunk
- 给资源添加哈希，用于在客户端设置强缓存，提升二次加载性能

实际上，在前端项目中，并不是所有资源都要经过 Webpack 处理的。例如一些 SDK 的代码，已经经过构建（打包、编译、压缩），并且也无需修改内部逻辑，这种情况下就可以不打包，直接在 HTML 入口文件中引入，这样可以提升打包、构建的效率。

对于不打包的资源，可以放到 public 下，CRA 会直接 copy 到 build 目录中，这样就可以通过路径直接访问了。

:::tip

当然更好的做法是直接上传 CDN，例如 `vue.runtime.esm.js` 和 `react.production.min.js` 都可以直接用 CDN 的地址。

:::

这些资源一般需要手动修改路径，添加 `/tclient` 资源前缀。但是看了下 CRA 的 HTML 模板，发现里面支持变量配置：

```html title="public/index.html"
<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
<!--
  Notice the use of %PUBLIC_URL% in the tags above.
  It will be replaced with the URL of the `public` folder during the build.
  Only files inside the `public` folder can be referenced from the HTML.

  Unlike "/favicon.ico" or "favicon.ico", "%PUBLIC_URL%/favicon.ico" will
  work correctly both with client-side routing and a non-root public URL.
  Learn how to configure a non-root public URL by running `npm run build`.
-->
```

看下 CRA 源码是怎么实现的：

```js title="packages/react-scripts/config/webpack.config.js:644"
// Makes some environment variables available in index.html.
// The public URL is available as %PUBLIC_URL% in index.html, e.g.:
// <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
// It will be an empty string unless you specify "homepage"
// in `package.json`, in which case it will be the pathname of that URL.
new InterpolateHtmlPlugin(HtmlWebpackPlugin, env.raw),
```

然后 `env` 从这里获取：

```js title="packages/react-scripts/config/webpack.config.js:113"
// We will provide `paths.publicUrlOrPath` to our app
// as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
// Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
// Get environment variables to inject into our app.
const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
```

`getClientEnvironment` 用来获取暴露给前端项目的环境变量，例如 `NODE_ENV`、`PUBLIC_URL` 和所有以 `REACT_APP_` 开头的环境变量，然后返回 `raw` 和 `stringified` 组成的对象，`raw` 就是原始对象，`stringified` 代表序列化后的结果，可以直接传给 DefinePlugin。

> 还有一些环境变量是给 Webpack 打包用，或者给 devServer 用的，例如 `PORT`、`DISABLE_ESLINT_PLUGIN` 等

然后 `publicUrlOrPath` 是从这里拿到的：

```js title="packages/react-scripts/config/path.js:26"
const publicUrlOrPath = getPublicUrlOrPath(
  process.env.NODE_ENV === 'development',
  require(resolveApp('package.json')).homepage,
  process.env.PUBLIC_URL
);
```

:::tip

注意 `PUBLIC_URL` 和 package.json 中的 `homepage` 字段都可以设置静态资源前缀，`PUBLIC_URL` 优先级更高。`getPublicUrlOrPath` 作用之一是确保路径后面都加了 `/`。

:::

看到这里大家应该都明白了，之前配置路由 `basename` 的时候也用到了 `PUBLIC_URL` 的环境变量，并且值是一样的。此外，`PUBLIC_URL` 除了暴露给前端项目之外，还会作为 Webpack 的 `output.publicPath` 配置项（之前 customize-cra 的配置函数就不需要了）：

```js title="packages/react-scripts/config/webpack.config.js:214"
output: {
  // webpack uses `publicPath` to determine where the app is being served from.
  // It requires a trailing slash, or the file assets will get an incorrect path.
  // We inferred the "public path" (such as / or /my-project) from homepage.
  publicPath: paths.publicUrlOrPath,
}
```

### 4) 总结

配置 `PUBLIC_URL` 环境变量，实现修改 Webpack 的 `output.publicPath` 配置项，给 Webpack 打包的资源路径加上静态资源前缀：

```bash title=".env.production"
# 生产环境使用 /tclient
PUBLIC_URL=/tclient
```

```bash title=".env.development"
# 开发环境还是根路径访问
PUBLIC_URL=/
```

在 HTML 入口文件引入 public 下的静态资源，在路径前记得拼接 `%PUBLIC_URL%` 参数，给 public 下的资源添加前缀：

```html title="public/index.html"
<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
```

最后，给前端路由添加 `basename`：

```tsx {6} title="src/App.tsx"
import * as React from "react";
import { BrowserRouter } from "react-router-dom";

const App: React.FC<{}> = () => {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Index />
    </BrowserRouter>
  );
}

export default App;
```

## 解决 CRA 项目在 CI 环境因 ESLint 报错导致打包失败的问题

CRA 内部使用 `ESLint Plugin` 进行代码检查，而非命令的方式。当 ESLint 存在问题时，CRA 如果判断当前是 CI 环境，则直接报错并退出进程，导致打包失败：

```js title="packages/react-scripts/config/webpack.config.js"
const emitErrorsAsWarnings = process.env.ESLINT_NO_DEV_ERRORS === 'true';
const disableESLintPlugin = process.env.DISABLE_ESLINT_PLUGIN === 'true';

module.exports = {
  plugins: [
    !disableESLintPlugin &&
      new ESLintPlugin({
        // Plugin options
        // ...
        failOnError: !(isEnvDevelopment && emitErrorsAsWarnings),
      })
  ]
}
```

:::tip

从源码中可以看出，在开发环境下可以通过配置 `emitErrorsAsWarnings` 关闭报错，只打印日志。但是在 CI 环境中，由于 `isEnvDevelopment` 已经为 `false`，此时不管第二个参数怎么配置，最终结果都是 ESLint 报错时退出进程，导致打包失败。

这里补充一下，为什么 CRA 使用 CI 检查，而不是 Git Hook（例如 husky）的方式检查。它们的最大的区别在于一个是服务端检查，一个是客户端检查。而客户端检查是天生不可信任的。对于 `git hooks` 而言，很容易通过 `git commit --no-verify` 而跳过。相比之下，CI 检查是无法绕过的，最重要的是，CI 还可对部署及其后的一系列操作进行检查，如端对端测试、性能测试等。

:::

解决 CI 环境下 ESLint 报错导致打包失败，最简单的办法就是在生产环境下禁用 ESLint：

```bash title=".env.production"
DISABLE_ESLINT_PLUGIN=true
```

> 当然更合理的做法应该是在开发环境下就启用严格的 ESLint 检查，确保提交的代码都是符合规范的

## 参考

[都 2022 年了，手动搭建 React 开发环境很难吗](https://juejin.cn/post/7087811040591675428)

[会写 TypeScript 但你真的会 TS 编译配置吗](https://juejin.cn/post/7039583726375796749)

[用 Redux 做状态管理，真的很简单🦆](https://juejin.cn/post/7071066976830881823)

[「React进阶」react-router v6 通关指南](https://juejin.cn/post/7069555976717729805)

Usage With TypeScript - Redux Toolkit

https://redux-toolkit.js.org/usage/usage-with-typescript

https://redux.js.org/introduction/why-rtk-is-redux-today
