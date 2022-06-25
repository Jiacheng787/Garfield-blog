---
slug: 前端包管理器简史,npm-为什么会慢
title: 前端包管理器简史,npm 为什么会慢
date: 2022-05-01T23:28
description: This is my first post on Docusaurus 2.
authors: [garfield]
tags: []
---

<!--truncate-->

## npm@v3 之前

- 嵌套结构（nest），会出现大量重复装包的问题
- 因为是树型结构，`node_modules` 嵌套层级过深，导致文件路径过长
- 破坏单例模式，例如在两个不同包引入的 React 不是同一个模块实例

比如项目依赖了 `A` 和 `C`，而 `A` 和 `C` 依赖了不同版本的 `B@1.0` 和 `B@2.0`，`node_modules` 结构如下：

```bash
node_modules
├── A@1.0.0
│   └── node_modules
│       └── B@1.0.0
└── C@1.0.0
    └── node_modules
        └── B@2.0.0
```

如果 `D` 也依赖 `B@1.0`，会生成如下的嵌套结构：

```bash
node_modules
├── A@1.0.0
│   └── node_modules
│       └── B@1.0.0
├── C@1.0.0
│   └── node_modules
│       └── B@2.0.0
└── D@1.0.0
    └── node_modules
        └── B@1.0.0
```

可以看到同版本的 `B` 分别被 `A` 和 `D` 安装了两次。

## npm@v3 / yarn

- 分身依赖：npm@v3 使用扁平化（flat）的方式安装依赖，将子依赖提升（hoist）到根目录，一定程度上解决了重复装包的问题，但是注意并没有完全解决
- 幽灵依赖：由于使用扁平化方式安装，没有在 `package.json` 里声明的包竟然也可以在项目中使用了
- 平铺减少安装没有减省时间，因为扁平化算法比较复杂，时间居然还增加了

扁平化方式安装，不会造成大量包的重复安装，依赖的层级也不会太深，解决了依赖地狱问题，但也形成了新的问题。

### 1) 幽灵依赖 Phantom dependencies

幽灵依赖是指在 `package.json` 中未定义的依赖，但项目中依然可以正确地被引用到。

可以看到 `A` 的子依赖的 `B@1.0` 不再放在 `A` 的 `node_modules` 下了，而是与 `A` 同层级，而 `C` 依赖的 `B@2.0` 因为版本号原因还是嵌套在 `C` 的 `node_modules` 下：

```bash
node_modules
├── A@1.0.0
├── B@1.0.0
└── C@1.0.0
    └── node_modules
        └── B@2.0.0
```

> 注意，这里安装同一个包的不同版本不算重复安装

### 2) 不确定性 Non-Determinism

扁平化安装使得依赖树结构变得不稳定，同一个包的不同版本，谁会提升到根目录，完全取决于安装顺序。同样的 `package.json` 文件，`npm install` 后可能会得到不同的 `node_modules` 目录结构。

还是之前的例子，`A` 依赖 `B@1.0`，`C` 依赖 `B@2.0`，依赖安装后究竟应该提升 `B@1.0` 还是 `B@2.0`，完全取决于安装顺序：

```bash
node_modules
├── A@1.0.0
├── B@1.0.0
└── C@1.0.0
    └── node_modules
        └── B@2.0.0
```

```bash
node_modules
├── A@1.0.0
│   └── node_modules
│       └── B@1.0.0
├── B@2.0.0
└── C@1.0.0
```

如果有 `package.json` 变更，本地需要删除 `node_modules` 重新 `npm install`，否则可能会导致生产环境与开发环境 `node_modules` 结构不同，代码无法正常运行。

### 3) 依赖分身 Doppelgangers

假设继续再安装依赖 `B@1.0` 的 `D` 模块和依赖 `@B2.0` 的 `E` 模块，此时：

- `A` 和 `D` 依赖 `B@1.0`
- `C` 和 `E` 依赖 `B@2.0`

以下是提升 `B@1.0` 的 `node_modules` 结构：

```bash
node_modules
├── A@1.0.0
├── B@1.0.0
├── D@1.0.0
├── C@1.0.0
│   └── node_modules
│       └── B@2.0.0
└── E@1.0.0
    └── node_modules
        └── B@2.0.0
```

由于根目录已经存在了 `B@1.0`，因此 `B@2.0` 只能分别嵌套安装。可以看到 `B@2.0` 会被安装两次，这两个重复安装的 `B` 就叫 doppelgangers。

而且虽然看起来模块 `C` 和 `E` 都依赖 `B@2.0`，但其实引用的不是同一个 `B`，破坏单例模式，导出的不是同一个模块实例。

> 这里可以看出，扁平化安装并没有完全解决依赖重复安装问题

## npm@v5 / yarn

该版本引入了一个 `lock` 文件，以解决 `node_modules` 安装中的不确定因素。这使得无论你安装多少次，都能有一个一样结构的`node_modules`。

然而，平铺式的算法的复杂性，幽灵依赖之类的问题还是没有解决。

:::tip

lockfile 两个小技巧：

- 如果有同事安装依赖之后本地跑不起来，不要给他 `node_modules`，只要给他一份 lockfile 即可。只要 lockfile 一样，大家 `yarn install` 之后得到的 `node_modules` 结构也是一样的
- 由于 npm / yarn 默认锁定大版本号，允许小版本和补丁版本升级，如果需要知道某个依赖实际安装的版本，不用再到 `node_modules` 里面去找了，只需要在 lockfile 里面搜索就好

:::

## pnpm

与依赖提升和扁平化的 `node_modules` 不同，pnpm 引入了另一套依赖管理策略：**内容寻址存储**。

该策略会将包安装在系统的全局 store 中，依赖的每个版本只会在系统中安装一次。

在引用项目 `node_modules` 的依赖时，会通过硬链接与符号链接在全局 store 中找到这个文件。为了实现此过程，`node_modules` 下会多出 `.pnpm` 目录，而且是非扁平化结构。

- **硬链接 Hard link**：硬链接可以理解为源文件的副本，项目里安装的其实是副本，它使得用户可以通过路径引用查找到全局 store 中的源文件，而且这个副本根本不占任何空间。同时，pnpm 会在全局 store 里存储硬链接，不同的项目可以从全局 store 寻找到同一个依赖，大大地节省了磁盘空间
- **符号链接 Symbolic link**：也叫软连接，可以理解为快捷方式，pnpm 可以通过它找到对应磁盘目录下的依赖地址

> 虽说 npm / yarn 也有全局缓存，但是每次安装依赖的时候，如果缓存命中，会从全局缓存中 copy 一份到工程目录下的 `node_modules` 中

这套全新的机制设计地十分巧妙，不仅兼容 node 的依赖解析，同时也解决了：

- 幽灵依赖问题：只有直接依赖会平铺在 `node_modules` 下，子依赖不会被提升，不会产生幽灵依赖
- 依赖分身问题：相同的依赖只会在全局 store 中安装一次。项目中的都是源文件的副本，几乎不占用任何空间，没有了依赖分身

同时，由于链接的优势，pnpm 的安装速度在大多数场景都比 npm 和 yarn 快 2 倍，节省的磁盘空间也更多。

但也存在一些弊端：

- 由于 pnpm 创建的 `node_modules` 依赖软链接，因此在不支持软链接的环境中，无法使用 pnpm，比如 Electron 应用
- 因为依赖源文件是安装在 store 中，调试依赖或 `patch-package` 给依赖打补丁也不太方便，可能会影响其他项目

## yarn Plug’n’Play

2020 年 1 月，yarn v2 发布，也叫 yarn berry（v1 叫 yarn classic）。它是对 yarn 的一次重大升级，其中一项重要更新就是 Plug’n’Play（Plug'n'Play = Plug and Play = PnP，即插即用）。

npm 与 yarn 的依赖安装与依赖解析都涉及大量的文件 I/O，效率不高。开发 Plug’n’Play 最直接的原因就是依赖引用慢，依赖安装慢。

### 1) 抛弃 node_modules

无论是 npm 还是 yarn，都具备缓存的功能，大多数情况下安装依赖时，其实是将缓存中的相关包复制到项目目录中 `node_modules` 里。

而 yarn PnP 则不会进行拷贝这一步，而是在项目里维护一张静态映射表 pnp.cjs。

pnp.cjs 会记录依赖在缓存中的具体位置，所有依赖都存在全局缓存中。同时自建了一个解析器，在依赖引用时，帮助 node 从全局缓存目录中发现依赖，而不是查找 `node_modules`。

这样就避免了大量的 I/O 操作同时项目目录也不会有 `node_modules` 目录生成，同版本的依赖在全局也只会有一份，依赖的安装速度和解析速度都有较大提升。

pnpm 在 2020 年底的 v5.9 也支持了 PnP。

### 2) 脱离 node 生态

pnp 比较明显的缺点是脱离了 node 生态。

- 因为使用 PnP 不会再有 `node_modules` 了，但是 Webpack，Babel 等各种前端工具都依赖 `node_modules`。虽然很多工具比如 pnp-webpack-plugin 已经在解决了，但难免会有兼容性风险
- PnP 自建了依赖解析器，所有的依赖引用都必须由解析器执行，因此只能通过 yarn 命令来执行 node 脚本

## 总结

目前还没有完美的依赖管理方案，可以看到在依赖管理的发展过程中，出现了：

- 不同的 `node_modules` 结构，有嵌套，扁平，甚至没有 `node_modules`，不同的结构也伴随着兼容与安全问题
- 不同的依赖存储方式来节约磁盘空间，提升安装速度
- 每种管理器都伴随新的工具和命令，不同程度的可配置性和扩展性，影响开发者体验
- 这些包管理器也对 monorepo 有不同程度的支持，会直接影响项目的可维护性和速度

## 参考

[深入浅出 npm & yarn & pnpm 包管理机制](https://mp.weixin.qq.com/s/ZTI-8RI0l314Ki9oBxqRWw)

[看了9个开源的 Vue3 组件库，发现了这些前端的流行趋势](https://juejin.cn/post/7092766235380678687)

[深入浅出 tnpm rapid 模式 - 如何比 pnpm 快 10 秒](https://zhuanlan.zhihu.com/p/455809528)

[pnpm 源码结构及调试指南](https://mp.weixin.qq.com/s/grb2OlBYiwU3TOkEtNZReA)

[【第2506期】JavaScript 包管理器简史（npm/yarn/pnpm）](https://mp.weixin.qq.com/s/0Nx093GdMcYo5Mr5VRFDjw)
