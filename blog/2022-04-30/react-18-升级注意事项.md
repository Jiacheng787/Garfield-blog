---
slug: react-18-升级注意事项
title: React 18 升级注意事项
date: 2022-04-30T20:49
authors: [garfield]
tags: []
---

<!--truncate-->

## 1. React.StrictMode 导致所有组件重复挂载两次

使用 CRA 5.0.1 搭建 React 项目，默认的项目模板中，根组件使用了 `React.StrictMode` 包裹，结果出现了所有组件都重复挂载的情况，导致组件中接口调了两次。看了下文档，确实是 React 18 中引入的 Breaking Change，启用严格模式，会导致所有组件重复挂载两次（即使用了 `React.memo` 也会重复挂载）：

> Stricter Strict Mode: In the future, React will provide a feature that lets components preserve state between unmounts. To prepare for it, React 18 introduces a new development-only check to Strict Mode. React will automatically unmount and remount every component, whenever a component mounts for the first time, restoring the previous state on the second mount. If this breaks your app, consider removing Strict Mode until you can fix the components to be resilient to remounting with existing state

:::tip

使用 CRA 创建的 React 18 项目，建议移除 `React.StrictMode`

:::

## 2. React 18 中使用了 antd 的 message 组件控制台打印警告信息

React 18 使用了新的 `ReactDOM.createRoot()` API 挂载根节点，Concurrent Mode 需要通过此 API 开启，但是 antd 中的 message 等组件内部仍使用 `ReactDOM.render()` 挂载根节点，此时在控制台会打印警告，注意这并不是报错，仅仅只是 fallback 到 legacy mode 而已。

Antd 最近发布了 4.20.0 版本，增加了对 React18 的支持：

:::tip

🔥 React 18 Support
- 🐞 Fix Form with React 18 StrictMode missing error message update. #35096
- 🐞 Fix Notification and Message throw createRoot warning in React 18. #35030
- 🐞 Fix BackTop not working in StrictMode. #34858 @tmkx

:::

> https://github.com/ant-design/ant-design/releases/tag/4.20.0

## 3. React 18 不支持 IE ？

看到有博客说 React18 不再支持 IE，但我看了下官方的说明：

> New JS Environment Requirements: React now depends on modern browsers features including `Promise`, `Symbol`, and `Object.assign`. If you support older browsers and devices such as Internet Explorer which do not provide modern browser features natively or have non-compliant implementations, consider including a global polyfill in your bundled application

显然这些 API 在 core-js 中都有 polyfill，因此如要支持 IE 只需在 browserlists 中增加 IE 支持即可。

:::tip

升级前最好仔细看一遍官方的说明，特别是 Breaking Change：

> https://github.com/facebook/react/releases/tag/v18.0.0

:::

## 参考

[React 18 全览](https://mp.weixin.qq.com/s/t3dYc3Md1dpiv1vaFa5plA)

[React 18 对 Hooks 的影响](https://mp.weixin.qq.com/s/fgT7Kxs_0feRx4TkBe6G5Q)

[React 的心智模型](https://mp.weixin.qq.com/s/GatHpP3BRLV_I48MfpzR4A)

[你不知道的 React v18 的任务调度机制](https://mp.weixin.qq.com/s/qyr6MnPtvnELDSbPJ2VtIw)
