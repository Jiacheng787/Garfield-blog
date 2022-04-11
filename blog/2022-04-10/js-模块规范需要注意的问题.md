---
slug: js-模块规范需要注意的问题
title: JS 模块规范需要注意的问题
date: 2022-04-10T16:36
authors: [garfield]
tags: [ESM, CJS]
---

<!--truncate-->

## 1. CommonJS 中有几种导出方式？

在 CommonJS 中，导出方式只有一种：

```js
const sum = {
  // ...
}
module.exports = sum;
```

而 `exports` 仅仅只是 `module.exports` 的引用而已：

```js
exports = module.exports
```

以下两种写法是等价的：

```js
exports.a = 3;
module.exports.a = 3;
```

一道题关于 `exports` 与 `module.exports` 的区别，以下 `console.log` 输出什么：

```js
// hello.js
exports.a = 3;
module.exports.b = 4;

// index.js
const hello = require('./hello');
console.log(hello); // { a: 3, b: 4 }
```

再来一道题：

```js
// hello.js
exports.a = 3;
module.exports = { b: 4 };

// index.js
const hello = require('./hello');
console.log(hello); // { b: 4 }
```

:::tip 总结

CommonJS 导出方式只有 `module.exports` 一种，`exports` 仅仅只是 `module.exports` 的引用而已：

```js
exports = module.exports = {};
```

CommonJS 导出的是 `module.exports` 指针指向的对象：

```js
function loadModule(require, module, exports) {
  exports.a = 3;
  module.exports = { b: 4 };

  return module.exports;
}
```

:::

## 2. ES Module 有几种导出方式？

看过阮一峰教程的同学应该都知道：

- Named Export
- Default Export

但实际上，ES Module 只有 Named Export 一种，Default Export 仅仅只是使用了别名而已：

```js
// modules.js
function add(x, y) {
  return x * y;
}
export default add;
// 等价于
// export { add as default };

// app.js
import foo from 'modules';
// 等同于
// import { default as foo } from 'modules';
```

> 这也就是为什么一个模块可以有多个 Named Export，但只能有一个 Default Export

## 3. 如何理解 Node.js 模块

一个模块实际上可以看做一个 `once` 函数，头部的 `require` 命令可以看做入参，`module.exports` 可以看做返回值。

当首次加载一个模块的时候，就会运行这个模块代码，可以看做是调用一个函数，执行结束后得到导出的内容并被缓存，可以看做函数返回一个值。当再次加载这个模块，不再执行这个模块代码，而是直接从缓存中取值。

```js
// foo.js
console.log("load module");

function run() {
  console.log("foo called");
}

module.exports = run;

// main.js
// 模块首次加载的时候打印一次 load module
const foo = require("./foo.js");
// 后续每次调用 run 方法打印 foo called
foo.run();
```

因此，使用 `import` 或者 `require` 导入模块时，如果没有加载过该模块，会 **先执行模块代码**，然后 **缓存并返回导出内容**。有时候，我们只需要执行模块代码，无需获取导出内容，就可以这样写：

```js
require("./dist/main.js");
// 或者
import "./dist/main.js";
```

这种写法有什么应用场景呢？有时候我们开发 NPM 包，希望可以通过命令方式使用，就需要在 `package.json` 中注册一个命令，指向可执行文件：

```json
// package.json
{
  "bin": {
    "garfield-cli": "./bin/cli.js"
  }
}
```

在 `cli.js` 中添加如下内容：

```js
#! /usr/bin/env node
require("./dist/main.js");
```

这里的 `require` 看似是加载了一个模块，但实际上我们只是用它来运行 `main.js` 中的代码。

## 4. Node.js 环境下如何使用 ES Module

这是一个非常有意思的问题，你如果接触过前端工程化配置，你就会发现，在一个前端工程中，只有在 `src` 目录下的业务代码中可以使用 ESM 规范，但是项目根目录下 `webpack.config.js`、`babel.config.js` 等配置中，还是只能用 CJS 规范。

之所以会有不同的模块规范，完全是因为运行环境不同导致的：

- `src` 目录下的业务代码，会被 Webpack 处理，用于生成最终的构建产物，因此只要打包工具支持就可以使用 ESM
- 而 Webpack、Babel 等构建工具是在 Node.js 环境下运行的，因此对应配置也会被作为 Node.js 模块加载

在 Node.js 中默认的模块规范是 CJS，从 Node.js v13.2 开始，Node.js 已经支持 ESM 规范，但是默认不开启。可以通过两种方式启用：

- 文件后缀为 `.mjs` 会被始终视为 ESM
- `package.json` 中配置 `"type": "module"`

:::tip

总结为一句话：`.mjs` 文件总是以 ES6 模块加载，`.cjs` 文件总是以 CommonJS 模块加载，`.js` 文件的加载取决于 `package.json` 里面 `type` 字段的设置

:::

假如不想通过上述方式启用，还有一些方法：

- 通过 Webpack 等打包工具支持 ESM 模块（Webpack 默认使用 `web` 环境构建，需要配置 `target: "node"` 避免打包 Node 内置模块）；
- 还可以使用 `ts-node`、`jiti` 等 runtime 支持 ESM 模块（内部使用 `tsc` 或者 `babel` 进行编译）；
