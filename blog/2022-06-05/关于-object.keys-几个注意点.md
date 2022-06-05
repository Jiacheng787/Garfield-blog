---
slug: 关于-object.keys-几个注意点
title: 关于 Object.keys 几个注意点
date: 2022-06-05T20:22
authors: [garfield]
tags: []
---

<!--truncate-->

## 1. `Object.keys()` 返回类型始终为 `string[]`

因为 JS 对象 key 的类型只有三种：`number`、`string`、`Symbol`，需要注意 `number` 类型底层也是按 `string` 进行存储，而 `Symbol` 类型不可枚举。

## 2. ES2015 之后 `Object.keys()` 输出顺序是可以预测的

我们说普通对象的 Key 是无序的，不可靠的，指的是不能正确维护插入顺序，与之相对的是 Map 实例会维护键值对的插入顺序。

在 ES2015 之后，普通对象 Key 顺序是可预测的。先按照自然数升序进行排序，然后按照非数字的 String 的加入时间排序，然后按照 Symbol 的时间顺序进行排序。也就是说他们会先按照上述的分类进行拆分，先按照自然数、非自然数、Symbol 的顺序进行排序，然后根据上述三种类型下内部的顺序进行排序。

> 使用 `Object.keys()` 只会输出对象自身可枚举属性的 key，不含 `Symbol` 类型的 key。如果要输出 `Symbol` 类型 key，可以使用 `Reflect.ownKeys()`

[\[科普\] JS中Object的keys是无序的吗](https://mp.weixin.qq.com/s/qyyrQNC6q6p496OdZIQ6ew)
