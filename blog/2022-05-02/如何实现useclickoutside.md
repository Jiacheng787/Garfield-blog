---
slug: 如何实现useclickoutside
title: 如何实现useClickOutside
date: 2022-05-02T19:33
authors: [garfield]
tags: []
---

<!--truncate-->

项目中经常会用到各种 popover、Modal、Dialog 等组件，这些组件通常都需要有“点击页面其他元素关闭”的功能。

用过 Vue 的同学应该都知道 Element-UI 中提供了一个 clickoutside 的指令，开箱即用。在 React 项目中，该如何实现呢？

在 ahooks 中有一个 `useClickAway` 钩子，也可以实现上述功能，用法如下：

```tsx
import React, { useState, useRef } from 'react';
import { useClickAway } from 'ahooks';

export default () => {
  const [counter, setCounter] = useState(0);
  const ref = useRef<HTMLButtonElement>(null);
  useClickAway(() => {
    setCounter((s) => s + 1);
  }, ref);

  return (
    <div>
      <button ref={ref} type="button">
        box
      </button>
      <p>counter: {counter}</p>
    </div>
  );
};
```

> 很明显，只有在点击 `button` 之外的区域，才会调用 `setCounter()` 修改状态

那么 `useClickAway` 是如何实现的呢，我们来看下源码：

```ts
import useLatest from '../useLatest';
import type { BasicTarget } from '../utils/domTarget';
import { getTargetElement } from '../utils/domTarget';
import useEffectWithTarget from '../utils/useEffectWithTarget';

/**
 * useClickAway 接受三个参数
 * @param onClickAway 点击元素外区域需要触发的回调
 * @param target DOM 节点或者 Ref，支持数组
 * @param eventName 指定需要监听的事件，支持数组，可选，默认为 "click"
 */
export default function useClickAway<T extends Event = Event>(
  onClickAway: (event: T) => void,
  target: BasicTarget | BasicTarget[],
  eventName: string | string[] = 'click',
) {
  // useLatest 就是对 useRef 的封装，返回 ref
  // 这里使用 ref 缓存 onClickAway 回调函数
  const onClickAwayRef = useLatest(onClickAway);

  // useEffectWithTarget 可以简单理解为对 useEffect 的封装
  useEffectWithTarget(
    () => {
      const handler = (event: any) => {
        const targets = Array.isArray(target) ? target : [target];
        if (
          targets.some((item) => {
            // getTargetElement 如果 dom 元素直接返回
            // 如果是 ref 则返回 ref.current
            const targetElement = getTargetElement(item);
            // useClickAway 核心，判断是否在元素内部点击
            // 如果在内部点击，则 handler 直接 return，不执行事件回调
            return !targetElement || targetElement?.contains(event.target);
          })
        ) {
          return;
        }
        // 在元素外部点击，执行事件回调
        onClickAwayRef.current(event);
      };

      // 支持绑定多个 event，默认是 "click"
      const eventNames = Array.isArray(eventName) ? eventName : [eventName];

      eventNames.forEach((event) => document.addEventListener(event, handler));

      return () => {
        eventNames.forEach((event) => document.removeEventListener(event, handler));
      };
    },
    Array.isArray(eventName) ? eventName : [eventName],
    target,
  );
}
```

这里有同学可能会问，对于一个 Modal 来说，target 不是只有一个吗，为啥要支持多个 target。需要注意，有时候 Modal 中会包含一些下拉选择的组件，此时如果只传一个 target，那么当点击下拉选择的时候，也会判断为在 Modal 外点击，Modal 可能会在不需要关闭的时候关闭，这时候就会有 bug 了。所以在使用 `useClickAway` 的时候，需要把下拉选择等组件的 dom 节点也作为 target 传入，确保 `useClickAway` 可以正常判断。
