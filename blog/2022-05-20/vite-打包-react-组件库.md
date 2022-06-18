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

所谓依赖外部化，是指通过配置 `external` 选项，在打包的时候跳过模块解析，进而在构建产物中保留 `import` 语句，由业务项目引入该库的时候再统一打包。这样做的好处就是可以减少模块冗余，防止业务项目的构建产物存在多份同样的代码。

npm 包的依赖有哪些分类：

- 打包构建的依赖
  - 例如 Vite、Webpack、Babel 等等，在 Node 环境下打包构建的脚本，不会进入打包产物
- 需要进入运行时的依赖
  - npm 包构建的时候直接打包的依赖
  - npm 包构建的时候不打包（外部化依赖，在运行环境打包）
    - 在 `peerDependencies` 中声明的依赖
    - 在 `dependencies` 中声明的依赖

依赖外部化，有两种做法，一个是放到 `dependencies` 下，另一种是放到 `peerDependencies` 下。两者的区别是，`dependencies` 下的依赖，在 npm 包安装的时候也会一并安装，而 `peerDependencies` 下的依赖则不会安装。有同学会问，既然不会安装的话，`peerDependencies` 和 `devDependencies` 的区别在哪里？`peerDependencies` 的作用就是声明运行时所需的依赖版本，当运行环境没安装依赖或者版本不符合的时候，包管理器会给出警告。

:::tip

NPM 发包需要仔细分割依赖，如果目标环境存在，就放在 `peerDependencies` 下面，如果目标环境不存在，则放在 `dependencies` 下面，如果 `devDependencies` 存在运行时依赖，则直接打包进去。在发包的时候，可以直接移除 `scripts` （如果不需要在目标环境执行 postinstall 之类的脚本）和 `devDependencies`。

[关于前端大管家 package.json，你知道多少？](https://mp.weixin.qq.com/s/fxX4oPHURDpvFvCIZUd7VA)

[这还是我最熟悉的package.json吗？](https://juejin.cn/post/6953867408096362503)

[npm init @vitejs/app的背后，仅是npm CLI的冰山一角](https://juejin.cn/post/6950817077670182943)

:::

对 npm 包来说，一般能打包就直接打包进去，如果在运行环境打包，会面临一系列问题（例如依赖版本不一致，导致潜在的不兼容问题）。

那为什么还要在运行环境打包呢？主要有两种场景：

**1. 业务工程已存在的依赖**

打包一个业务组件库，在该组件库中用到了 `react` 和 `antd`，而使用该组件库的业务工程同样也依赖了 `react` 和 `antd`。在这种情况下，如果业务组件库将 `react` 和 `antd` 放在 `dependencies` 下，业务工程引入的时候，只要版本不一致（哪怕小版本或者补丁版本），就会导致依赖重复安装。由于 **运行环境已经安装了这些依赖**，`react` 和 `antd` 就可以作为组件库的 `peerDependencies`，无需重复安装。但是这样就需要确保组件库的 `peerDependencies` 与目标环境安装依赖版本兼容性，防止组件库接入业务项目的时候因为依赖库版本不兼容而报错

**2. 业务工程不存在的依赖**

理论上只要业务工程存在的依赖，都可以放在 `peerDependencies` 下外部化处理，业务工程不存在的依赖则直接打包进去。但还是有一种情况不能打包，考虑这种场景，两个同事各自开发了一套业务组件库，需要在同一个业务工程接入，并且这两个组件库存在相同的依赖 `qs`（但是业务工程不存在）。这时候有两种做法：第一种比较偷懒，两个同事分别把依赖 `qs` 都打包进去，这样业务工程接入肯定没问题，但是很明显会造成代码冗余；第二种就是公共依赖 `qs` 不打包，在业务工程统一打包，这样就不会造成代码冗余。但是方案二还有两个问题需要解决：

- 由于业务工程原本没有 `qs`，因此打包的时候需要保证业务工程安装 `qs`
- 两个同事开发的组件库，必须使用同一版本的 `qs`，否则会导致业务工程安装两个不同版本的 `qs`，出现分身依赖，最终业务工程 Webpack 打包的时候，还是会作为两个不同模块进行解析，导致代码冗余

对于第一个问题，只需要在组件库的 `dependencies` 中声明 `qs` 依赖，在业务工程安装组件库的时候，就会安装 `qs`。

对于第二个问题，如何保证两个同事开发的组件库使用同一版本的 `qs`？由于 npm 包默认锁定大版本号，允许小版本和补丁版本升级，这就导致了依赖版本不受控问题。因此两个组件库都需要直接锁死 `qs` 的版本，确保业务工程接入的时候，安装同一版本的 `qs`。

### 2) 合理分包

为什么要分包？一句话总结：减少 chunk 资源冗余，提升缓存复用率。

### 3) 开发插件的时候考虑打包工具兼容性

例如开发一个按需引入的插件，开发 Babel 插件就比 Rollup 插件要好。为啥？因为 Rollup 插件只能给 Rollup 用，换做 Vite、Webpack 就用不了了，而 Babel 插件就很强大，可以支持各种打包器。

最近前端圈流行各种 `unplugin`，即同时支持 Vite、Webpack、Rollup 打包器的插件，特别是 antfu 大佬搞了一个 unjs：

> https://github.com/unjs

然后前不久刚发布正式版的 ElementPlus，官方提供的按需引入插件也做成了 `unplugin` 形式：

> https://github.com/element-plus/unplugin-element-plus

### 4) 纠正一些误区

有些同学把 **Vite 按需编译** 和一些打包优化手段例如 Tree-Shaking 等概念混淆了，这里纠正一下：

- Vite 按需编译只在开发阶段，当你执行 `vite` 命令，实际上只是启动了一个 devServer，不包含资源编译，只有你用浏览器去请求页面了，它才会编译当前页面路由所需的资源
- Tree-Shaking 是在生产环境打包中进行的优化，基于 ESM 的静态代码分析，可以理解为跨模块的 DCE

有些同学会问，Vite 既然可以按需编译，Antd 组件库是不是就不需要按需引入了？当然不是！前面说了按需编译只在开发阶段，难道生产环境打包你就不管了吗。这里分享一个本人的经验，Vite 实际上就是一个带有 devServer 的 Rollup，所以 Vite 打包可以直接参考 Rollup 进行配置。至于 Vite 开发环境，更多的是一个预览功能，我们无需进行任何优化，只要资源都加载到，页面能展示就行，重点应该关注的是生产环境打包。话说回来，Antd 组件库当然要做按需引入，想想如果用 Rollup 打包就好理解了。这里需要注意，虽然 Antd 支持 JS 模块的 Tree-Shaking，这也就意味着我们可以使用 named import 然后只打包用到的代码，但是 CSS 可做不到 Tree-Shaking，需要手动给每个组件导入样式，想偷懒就在入口文件全量导入 Antd 的样式，否则引入的组件都是没有样式的。所以实际上 Antd 按需引入，主要是为了样式的按需引入。

## 如何学习 Vite 配置

如果有些 Vite 配置不知道怎么写，文档也没有详细说明（特别是一些 rollup 的配置），这时候可以参考下 Vite 官方的 playground，给了非常详尽的 demo：

https://github.com/vitejs/vite/tree/main/playground

## Vite 存在哪些问题

### 1) 官方汇总的 issue

https://github.com/vitejs/vite/discussions/8232

### 2) 生态尚不完善

awesome-vite 上面很多插件都是个人开发，没有专门的团队维护，一堆陈年的 issue 都没处理。但是官方提供的插件又太少，难以满足复杂业务场景需要。


## Vite 源码分析

### 1) Vite 打包流程

首先调用 `rollup` 方法（Rollup 的编程式 API）编译出 `bundle` 添加到 `build` 数组中，接下来就是遍历它，进行 `bundle` 的写操作（即输出到硬盘上），因为 vite 使用的是 Rollup 完成文件的打包，所以这里调用的是 `bundle.write` 来将文件输出到硬盘上。

```ts title="packages/vite/src/node/build.ts"
for (const build of builds) {
  const bundle = await build.bundle;
  const { output } = await bundle[write ? 'write' : 'generate']({
    dir: resolvedAssetsPath,
    format: 'es',
    sourcemap,
    entryFileNames: `[name].[hash].js`,
    chunkFileNames: `[name].[hash].js`,
    assetFileNames: `[name].[hash].[ext]`,
    ...config.rollupOutputOptions
  });
  build.html = await renderIndex(output);
  build.assets = output
  await postBuildHooks.reduce(
    (queue, hook) => queue.then(() => hook(build as any)),
    Promise.resolve();
  )
}
```

:::tip

注意 Vite 2.x 源码结构稍有不同，但是整体流程还是类似的：

https://github.com/vitejs/vite/blob/ab23e6e7b490cf610a4465cc533f671a729fdfa8/packages/vite/src/node/build.ts#L543

:::

这里有一个值得学习的地方，这边 `postBuildHooks` 的类型定义是 `((build: any) => Promise<any>)[]`，如何保证调用顺序，即上一次调用完成后进行下一次调用？

通常我们用 `reduce` 做管道操作都是不能用于 Promise，因为管道操作需要将上一次调用的返回值，作为参数传入下一次调用，但 Promise 的话很可能是 `pending`，根本拿不到上一次调用的返回值。所以一般来说我们只能将 `reduce` 改成普通 `FOR` 循环：

```js
let initialValue = Promise.resolve();

for (const hooks of postBuildHooks) {
  initialValue = await hook(build);
}
```

而源码中对 `reducer` 函数进行了包装，将 `hook` 的执行放到 `then` 方法回调中，这样就可以保证调用顺序：

```ts
await postBuildHooks.reduce(
  (queue, hook) => queue.then(() => hook(build as any)),
  Promise.resolve();
)
```

对比一下函数式编程中 `compose` 的用法：

```ts
/**
 * 参数：[A, B, C, D]
 * 调用顺序：A(B(C(D())))
 */
const compose = (middlewares) => (initialValue) => middlewares.reduceRight(
  (accu, cur) => cur(accu),
  initialValue
);

/**
 * 参数：[A, B, C, D]
 * 调用顺序：D().then(res => C(res)).then(res => B(res)).then(res => A(res))
 * 以上只是为了让大家看清楚，简化之后如下：D().then(C).then(B).then(A)
 */
const asyncCompose = (middlewares) => (initialValue) => middlewares.reduceRight(
  (queue, hook) => queue.then(res => hook(res)),
  Promise.resolve(initialValue)
);
```

[vite 不支持 ie 11？configureBuild Hook 帮你定制 bundle 打包过程](https://juejin.cn/post/6889589799687028750)
