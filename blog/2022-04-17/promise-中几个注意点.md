---
slug: promise-中几个注意点
title: Promise 中几个注意点
date: 2022-04-17T12:43
authors: [garfield]
tags: [Promise]
---

<!--truncate-->

一般来说能用并发请求，就用并发请求。Chrome 浏览器对于 HTTP/1.1 支持最大并发数为 6，因此这种情况下如果还用串行方式效率就太低了。

```js
// 典型的串行请求的写法
// 只有等上一个请求响应之后，再发下一个请求
for (const url of urls) {
  const response = await fetch(url);
}

// 并发请求的写法
await Promise.all(
  urls.map(url => fetch(url))
);
```

:::tip

遇到过两种不能用并发请求的场景：

- 上一个请求响应的数据需要作为下一个请求的入参（这种情况后端做接口聚合是不是更合适，后端走 RPC 肯定比前端串行请求更快）
- 每个接口请求的频率不一样（例如有个列表数据的接口，在列表排序、筛选、分页都会请求，还有一个是渲染筛选列表数据的接口，则只需要在组件挂载的时候请求一次即可，如果做成并发请求，相当于把两个接口捆绑在一起了，反而造成大量不必要的请求）

:::

[写好 JavaScript 异步代码的几个推荐做法](https://mp.weixin.qq.com/s/XWZsKQECcsHAlE9cyqi9Eg)

https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/
