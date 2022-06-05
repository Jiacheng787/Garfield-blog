---
slug: 如何理解-useevent
title: 如何理解 useEvent
date: 2022-06-05T20:43
description: This is my first post on Docusaurus 2.
authors: [garfield]
tags: []
---

<!--truncate-->

useEvent 会将一个函数「持久化」，同时可以保证函数内部的变量引用永远是最新的。如果你用过 ahooks 的 `useMemoizedFn`，实现的效果是几乎一致的。再强调下 `useEvent` 的两个特性：

- 函数地址永远是不变的
- 函数内引用的变量永远是最新的

通过 `useEvent` 代替 `useCallback` 后，不用写 `deps` 函数了，并且函数地址永远是固定的，内部的 state 变量也永远是最新的。

useEvent 的实现原理比较简单：

```js
function useEvent(handler) {
  const handlerRef = useRef(null);

  // 用于确保函数内引用的变量永远是最新的
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  // 用于确保返回的函数地址永远不变
  return useCallback((...args) => {
    const fn = handlerRef.current;
    return fn(...args);
  }, []);
}
```

[React useEvent：砖家说的没问题](https://mp.weixin.qq.com/s/-6bQKIjH6WPcfuiCFtsjng)
