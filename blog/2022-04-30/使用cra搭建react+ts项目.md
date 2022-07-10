---
slug: 使用cra搭建react+ts项目
title: 使用CRA搭建React+TS项目
date: 2022-04-30T21:37
authors: [garfield]
tags: []
---

<!--truncate-->

## 1. 项目初始化

CRA v5.0.0 之后要求 `node >= 14`，毕竟现在 Node 12 已经不再维护了，所以如果是新项目，就尽量升级到 latest LTS 吧。

另外还要注意一些更新：

- CRA v5.0.0 开始支持 Webpack5
- CRA v5.0.1 开始，项目模板 React 升级到 React18

:::tip

好多同学都反映升级 React18 之后，组件会莫名其妙重复挂载两次，结果排查到最后发现是 `StrictMode` 引起的。

这里强烈建议先看一下 React18 官方的 Changelog，特别是 Breaking Change，然后再上手开发，以免遇到一些 bug。

> https://github.com/facebook/react/releases/tag/v18.0.0

:::

创建项目：

```bash
# 使用 npm
$ npm init react-app my-app

# 使用 yarn
$ yarn create react-app my-app
```

创建 TS 项目：

```bash
# 使用 npm
$ npm init react-app my-app --template typescript

# 使用 yarn
$ yarn create react-app my-app --template typescript
```

:::tip

通过上面的命令可以看出，CRA 创建普通项目和 TS 项目的区别就是项目模板不同而已，打包构建都是复用同一套配置，也就是说，即使是存量的 JS 项目，也可以很方便地迁移到 TS 项目。

CRA 官方文档：

https://create-react-app.dev/docs/getting-started

:::

## 2. 如何覆盖 CRA 默认 Webpack 配置

我们知道，在 Vue-cli 创建的项目中，我们可以在项目根目录创建一个 `vue.config.js` 传入自定义 Webpack 配置实现覆盖默认配置。虽说 CRA 并没有提供这个功能，但是官方还是提供了一些方法来覆盖 Webpack 配置。

一般来说覆盖 Webpack 配置，主要包括下面这些：

- 添加 babel 配置（通常都是 antd 按需引入、提案阶段语法插件等等）
- 添加 less 预编译配置（默认只有 scss）
- 添加 Webpack alias
- 修改 devServer 配置（例如修改端口）
- 添加代理配置（解决跨域问题）
- 禁用 CI 环境下 ESLint 检查（防止报错导致打包失败）

### 1) 使用 CRA 内置环境变量

CRA 内置了一些非常有用的环境变量，可以用来覆盖开发、生产环境下的默认行为。我们可以在项目根目录建一个 `.env` 文件：

```bash title=".env"
# assets 和 public 的静态资源前缀
PUBLIC_URL=/tclient
# 禁用 ESLint 检查
DISABLE_ESLINT_PLUGIN=true
```

```bash title=".env.development"
# 修改端口，默认是 3000
PORT=8066
```

```bash title=".env.production"
# 打包输出路径，注意默认是 /build
BUILD_PATH=/dist
```

:::tip

注意除了内置环境变量之外，自定义环境变量必须以 `REACT_APP_` 开头。

更多环境变量参考：

https://create-react-app.dev/docs/advanced-configuration

:::

### 2）使用 `setupProxy` 添加代理配置

CRA 允许在 `package.json` 中添加 `proxy` 字段，但是通常都无法满足需要：

```json title="package.json"
{
  "proxy": "http://localhost:4000",
}
```

此时，可以建一个 `src/setupProxy.js` 文件，手动配置代理：

```js title="src/setupProxy.js"
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
    })
  );
};
```

:::tip

注意 `setupProxy.js` 是 CRA 提供的功能，在启动 devServer 的时候，会自动加载该模块。

这里用到的 `http-proxy-middleware` 是 Express 的中间件，具体用法可以参考：

https://github.com/chimurai/http-proxy-middleware

:::

### 3) 使用 react-app-rewired

这个是万能方法，可以直接拿到 Webpack 配置并进行修改，基本不需要 eject 就能满足一切需要了。

首先 `react-app-rewired` 是一个开源库，维护、更新比较频繁：

> https://github.com/timarney/react-app-rewired

我们首先安装这个库：

```bash
$ yarn add react-app-rewired -D
```

在 `package.json` 中修改 npm scripts：

```json title="package.json"
{
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-app-rewired build",
    "test": "react-app-rewired test",
    "eject": "react-scripts eject"
  }
}
```

然后在项目根目录下建一个 `config-overrides.js`：

```js title="config-overrides.js"
module.exports = function override(config, env) {
  // 在这里可以修改 Webpack 配置
  return config;
}
```

通常 `react-app-rewired` 会搭配 `customize-cra` 一起使用，后者可以提供一些 Webpack 的配置函数，通过类似管道操作的方式进行配置，比手动修改 Webpack 配置方便一些。

这里注意 `customize-cra` 已经有两年没维护了，某些配置函数可能不兼容：

> https://github.com/arackaf/customize-cra

我们可以使用 `react-app-rewired` 添加 Babel 配置、添加 less 预编译配置、添加 Webpack alias 等等：

```js title="config-overrides.js"
const path = require("node:path");
const {
  override,
  fixBabelImports,
  addLessLoader,
  addWebpackAlias
} = require("customize-cra");

module.exports = override(
  // 配置 antd 按需引入
  // 主要是样式按需引入，JS 可以通过 Tree-Shaking 方式实现按需引入
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: true, // 或者css, true代表运用less
  }),
  addLessLoader({
    javascriptEnabled: true,
    modifyVars: {}
  }),
  addWebpackAlias({
    "@": path.resolve(__dirname, "src"),
    "@api": path.resolve(__dirname, "src/api"),
    "@pages": path.resolve(__dirname, "src/pages"),
    "@utils": path.resolve(__dirname, "src/utils"),
    "@store": path.resolve(__dirname, "src/store"),
    "@routes": path.resolve(__dirname, "src/routes"),
    "@components": path.resolve(__dirname, "src/components"),
  })
);
```

:::tip

注意 CRA 5.0.0 已经内置了 Babel 提案阶段语法插件，例如装饰器语法、类属性语法、可选链、空值合并运算符等等，这里不用再配置了。

在 TS 项目中配置 Webpack alias，还需要到 `tsconfig.json` 中添加如下配置：

```json title="tsconfig.json"
{
  "compilerOptions": {
    // 注意：baseUrl 必选，与 paths 成对出现，以 tsconfig.json 文件所在目录开始
    "baseUrl": ".", 
    "paths": {
      // 映射列表
      "@/*": [
        "src/*"
      ],
    }
  }
}
```

:::

## 3. 🚧 React Router v6 指南

[「React进阶」react-router v6 通关指南](https://juejin.cn/post/7069555976717729805)

https://github.com/remix-run/react-router

## 4. 🚧 Redux + React Redux + Redux Toolkit 指南

这里解释一下这三个库分别是干什么的：

- Redux：核心库
- React Redux：Redux 的 UI-binding，即 Redux 结合 React 使用的库。也就是说，Redux 只负责存储全局状态，暴露访问、修改状态的方法，但无法在状态改变的时候更新 UI。React Redux 可以进行依赖收集，订阅状态变化，在状态改变的时候通知 UI 更新。例如 `connect`、`useSelector`、`useDispatch` 等都由 React Redux 提供
- Redux Toolkit：让 Redux 用得更爽，可以减少模板代码。不再需要刻意关心如何组织编写 Reducer、Action creator、Action Type 等内容，同时，默认就融合支持 异步 Thunks

[用 Redux 做状态管理，真的很简单🦆](https://juejin.cn/post/7071066976830881823)

Usage With TypeScript - Redux Toolkit

https://redux-toolkit.js.org/usage/usage-with-typescript

https://redux.js.org/introduction/why-rtk-is-redux-today

## 5. 🚧 CSS 工程化指南

### 1) CSS Reset

为什么要 CSS Reset 呢？因为除了 `div`、`span` 等之外的标签，都有默认样式，而这些样式在不同浏览器中都不太一样，这对于 UI 交互一致性来说影响很大。因此 CSS Reset 的作用就是提供一套样式预设，抹平不同浏览器样式差异，提供一致性的默认样式。

:::tip

顺便一提，HTML 5 中其实新增了很多语义化标签，但是平时开发却用的很少，还是因为同样的问题，这些标签都有默认样式，更糟糕的是有些样式还不好覆盖。好在各种组件库（例如 antd、Element UI）提供了各种 UI 组件，能满足大部分场景的需要。

:::

CRA 内置了 PostCSS Normalize（相比 normalize.css 增加了根据 browserslist 配置按需使用），使用也很简单，只需要在根元素的样式文件（例如 `App.css`）加入下面的代码即可：

```css
@import-normalize; /* bring in normalize.css styles */
```

### 2) 使用哪种预编译器

在前端项目中 Less、Sass 其实都有用到，但还是推荐使用 Less。为什么不用 Sass 呢？其实 Sass 和 Less 本质上没有太多区别，也没有什么好坏之分，我选择 Less 的原因是，我的项目中大量使用 antd 的组件库，而 antd 使用的是 Less 的方案，而且如果要定制 antd 的主题，就必须用 Less。

### 3) 如何解决命名冲突

在多人协作项目中，各种命名五花八门，样式命名冲突问题比较严重。如何避免样式命名冲突呢？有不少解决方案：

- BEM 命名规范（可行性不高）
- Scoped CSS（Vue 项目用的比较多）
- CSS Module（推荐）
- CSS in JS
- 原子类 CSS

在 CRA 项目中推荐使用 CSS Module 方案，而且还可以跟 CSS 预编译器配合使用，例如 `.module.less` 等。

:::tip

注意，在 Webpack 打包的项目中，CSS Module 是由 css-loader 支持的（底层是 PostCSS 实现），默认根据 `.module.css` 等文件后缀开启，当然也可以全局启用，但是这样侵入性比较大。在 Vite 打包的项目中则是直接用了 PostCSS 实现 CSS Module。

:::

[【第2629期】中后台 CSS Modules 最佳实践](https://mp.weixin.qq.com/s/q8RDt9ekF0upq4KfEZ2jUQ)

## 6. 🚧 React 生态介绍

### 1) React 常用状态管理库

- Redux
- Mobx
- dva/umi
- Recoil
- Hookstate
- Rematch
- Jotai
- Zustand

### 2) 获取数据

- [React-query](https://github.com/tannerlinsley/react-query)
- [SWR](https://github.com/vercel/swr)

### 3) Hooks

- [React-use](https://github.com/streamich/react-use)
- [ahooks](https://github.com/alibaba/hooks)

### 4) 动画库

- [React-transition-group](https://github.com/reactjs/react-transition-group)
- [React-spring](https://github.com/pmndrs/react-spring)

### 5) 拖拽库

- [React-dnd](https://github.com/react-dnd/react-dnd)
- [react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd)

### 6) 其他

- [bytemd - 字节出品的 markdown 编辑器](https://github.com/bytedance/bytemd)
- [guide - 字节出品的 React 新手引导组件](https://github.com/bytedance/guide)

[20个GitHub仓库助你成为React大师](https://juejin.cn/post/7104460511869141006)

[2022 年的 React 生态](https://juejin.cn/post/7085542534943883301)

## 7. 🚧 React 性能优化指南

[从源码中来，到业务中去，React性能优化终极指南](https://mp.weixin.qq.com/s/DswfPb6J1w2B_MWj1TjyOg)

[剖析React核心设计原理—Virtual Dom](https://mp.weixin.qq.com/s/l19wbHNIrhjyD0HwJwuvmQ)

## 8. 🚧 TypeScript 接入指南

### 1) 如何引入 React

一般来说，在 React 项目中我们需要在每个文件顶部 `import`，即使该模块没有用到 React 的 API：

```jsx
import React from 'react';

function App() {
  return <h1>Hello world</h1>;
}
```

这是因为浏览器无法识别 JSX 语法，所以我们需要通过 Babel、TypeScript 等工具将 JSX 编译为浏览器能识别的 render 函数。在 React 17 之前，JSX 会转换为 `React.createElement(...)` 调用：

```jsx
import React from 'react';

function App() {
  return React.createElement('h1', null, 'Hello world');
}
```

> 实际上 JSX 就是一种领域特定语言

正是因为 JSX 会转换为 `React.createElement(...)`，所以每个组件顶部必须导入 `React`。但是 TS 中默认不能从没有设置默认导出的模块中默认导入，需要添加如下配置：

```json title="tsconfig.json"
{
  "compilerOptions": {
    // 允许从没有设置默认导出的模块中默认导入
    "allowSyntheticDefaultImports": true,
  }
}
```

实际上，在 TS 中更推荐下面的写法：

```jsx
import * as React from "react";
```

以上这种用法称为 classic JSX，那么在 React 17 中新增了一种 automatic JSX，不需要手动在每个组件顶部导入 `React`，同时新的 JSX 转换不会将 JSX 转换为 `React.createElement`，而是自动从 `react/jsx-runtime` 中引入新的入口函数并调用。下方是新 JSX 被转换编译后的结果：

```jsx
// 由编译器引入（禁止自己引入！）
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
  return _jsx('h1', { children: 'Hello world' });
}
```

> 注意，此时源代码无需引入 React 即可使用 JSX 了！（但是如果使用 React 提供的 Hook 或其他导出，这种情况下仍需引入 React）

新的 JSX 转换对应的配置是 `runtime: "automatic"`：

```js title="babel.config.js"
module.exports = {
  presets: [
    [
      "@babel/preset-react",
      {
        // 新的 JSX 转换 -> automatic
        // 旧的 JSX 转换 -> classic
        runtime: "automatic"
      }
    ]
  ]
}
```

:::tip

可以直接在 Babel Playground 看编译结果：

https://babeljs.io/repl

:::

在 CRA 创建的项目中，默认就启用了 automatic JSX，无需额外配置。当然如果手动配置，还需要添加如下配置：

```json title="tsconfig.json"
{
  "compilerOptions": {
    // 启用新的 JSX 转换
    "jsx": "react-jsx",
  }
}
```

```js title=".eslintrc.js"
module.exports = {
  extends: {
    // 当我们不去写 import React from 'react'
    // ESLint 不会报错
    'plugin:react/jsx-runtime',
  }
}
```

总结一下，在 TS 项目中引入 React 正确的方法是：

```jsx
import * as React from "react";
```

> 如果你的项目是 React 17+，虽然可以不写，但是大概率都会用到 Hooks，所以还是建议编写 `import` 语句

### 2) 如何声明 React 组件

**1. 不需要使用 `props` 和 `children`**

```tsx
import * as React from "react";

const App: React.FC = () => {
  return (
    <div>2333</div>
  ) 
}

export default React.memo(App);
```

**2. 使用 `props`**

```tsx
import * as React from "react";

type IProps = {
  foo: string;
  bar: number;
}

const App: React.FC<IProps> = ({ foo, bar }) => {
  return (
    <div>2333</div>
  )
}

export default React.memo(App);
```

**3. 使用 `props` 和 `children`**

```tsx
import * as React from "react";

type IProps = React.PropsWithChildren<{
  foo: string;
  bar: number;
}>

const App: React.FC<IProps> = ({ foo, bar, children }) => {
  return (
    <div>2333</div>
  )
}

export default React.memo(App);
```

:::tip

注意两点：

- 在 `.tsx` 文件中使用泛型会被识别为 JSX 标签，这种情况下需要写成 `<T extends {}>` 消除歧义
- React 组件中的内部 props，不能随意使用：`key`、`ref`、`children`

:::

## 9. CRA 项目非跟路径部署的正确姿势

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

## 10. 配置 ESLint 和 Prettier

### 1) 解决 CRA 项目在 CI 环境因 ESLint 报错导致打包失败的问题

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

### 2) VSCode 配置保存自动格式化

在上面的内容中，我们知道 CRA 实际上已经内置了 ESLint 配置，并且可以配合 Git Hooks、打包构建进行代码规范检查、格式化等。

但是在 Git Hooks、打包构建阶段进行 lint 并不是最好的做法，更好的做法是直接配置 VSCode 保存自动格式化，提升开发体验。

在项目根目录建一个 `.vscode/settings.json`，编写内容如下：

```json title=".vscode/settings.json"
{
  "files.eol": "\n",
  "editor.tabSize": 2,
  // 代码粘贴时格式化
  "editor.formatOnPaste": true,
  // 代码保存时格式化
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "javascriptreact", "vue", "typescript", "typescriptreact"],
  "editor.codeActionsOnSave": {
    // 在保存时使用 eslint 格式化
    "source.fixAll.eslint": true,
    // 保存时整理 import ，去掉没用的导包
    "source.organizeImports": true
  },
}
```

:::tip

推荐将上面的配置提交到代码仓库，这样多人协作开发的时候，大家都能使用同一套配置。

:::

另外，CRA 的 ESLint 配置实际上是一个单独的包，也就是说即使你的项目不是 CRA 搭建的，也可以使用 CRA 的 ESLint 配置：

> https://github.com/facebook/create-react-app/tree/main/packages/eslint-config-react-app

除了 CRA 官方的 ESLint 配置之外，还推荐腾讯 Alloy team 的 ESLint 配置：

> https://github.com/AlloyTeam/eslint-config-alloy

## 11. 参考

[都 2022 年了，手动搭建 React 开发环境很难吗](https://juejin.cn/post/7087811040591675428)

[会写 TypeScript 但你真的会 TS 编译配置吗](https://juejin.cn/post/7039583726375796749)

[用 Redux 做状态管理，真的很简单🦆](https://juejin.cn/post/7071066976830881823)

[「React进阶」react-router v6 通关指南](https://juejin.cn/post/7069555976717729805)

Usage With TypeScript - Redux Toolkit

https://redux-toolkit.js.org/usage/usage-with-typescript

https://redux.js.org/introduction/why-rtk-is-redux-today
