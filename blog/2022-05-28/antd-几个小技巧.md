---
slug: antd-几个小技巧
title: Antd 几个小技巧
date: 2022-05-28T20:03
authors: [garfield]
tags: []
---

<!--truncate-->

## Table 组件封装 defineColumn 函数

对于复杂的表格组件，一般 `column` 数组都会非常复杂，不能放在组件中定义，不然每次组件 rerender，`column` 数组都会重新生成，然后 props 改变还导致 `Table` 组件重新渲染。

通常我们会把 `column` 抽离到单独的模块维护，但是这样就存在一个问题，有时候需要在 `column` 定义操作按钮，例如修改组件状态等等，那 `column` 已经被抽离到组件外面了，还怎么访问、修改组件状态呢？

答案是封装 `defineColumn` 函数，函数就比直接一个变量要灵活很多，可以传递参数。我们可以把需要访问的变量、`setState` 方法通过参数的形式传递出来，这些参数会以闭包的形式存在，这样就可以在 `column` 中访问了。

此外还要注意一个问题，如果我们在组件中调用 `defineColumn` 函数，那不是组件每次 rerender 都会重新生成 `column` 数组，所以我们需要用 `React.useMemo` 包裹一下，缓存 `column` 数组（合理添加依赖项，当依赖项改变重新生成 `column` 数组，避免闭包陷阱），优化性能。

## Table 组件不需要手动加 key

我们知道 React 列表渲染需要加 `key`，这样可以高效更新虚拟 DOM，在 `Table` 组件中也不例外，需要给 `dataSource` 加 `key`。但实际上 `Table` 组件提供了一个 `rowKey` 选项，相当于不需要自己手动加 `key`：

```tsx
<Table
  columns={columns}
  dataSource={dataSource}
  rowKey="name"
/>
```

## 如何实现多行文本省略

这个功能不需要自己实现，自己实现还可能存在兼容性问题。只需要使用 antd 的 `Typography` 组件就可以了：

```tsx
import * as React from "react";
import { Typography } from "antd";

const { Paragraph } = Typography;

const App: React.FC<{}> = () => {
  return (
    <Paragraph
      ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
    >
      ...
    </Paragraph>
  )
}
```
