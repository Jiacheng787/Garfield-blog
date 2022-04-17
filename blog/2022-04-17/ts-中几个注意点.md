---
slug: ts-中几个注意点
title: TS 中几个注意点
date: 2022-04-17T11:27
authors: [garfield]
tags: [TypeScript]
---

<!--truncate-->

## TS 泛型和方法重载的区别

泛型主要针对 **可变参数类型**，不使用泛型就需要定义多个重载签名，很麻烦：

```ts
function fn(param: string): string
function fn(param: number): number
function fn(param: boolean): boolean
```

使用泛型直接一个签名搞定：

```ts
type Primitive = string | number | boolean;
function fn<T extends Primitive>(param: T): T
```

> 在泛型中可以使用 `extends` 关键字对泛型参数进行约束

方法重载主要针对 **可变参数个数**，该特性参考了 Java 的方法重载。由于 Java 不支持参数默认值，需要定义多个重载签名，根据实际调用传递的参数去匹配签名。在 TS 中也提供了方法重载特性，但在开发中很少用到，由于 TS 支持 **参数默认值**，因此可以直接通过参数默认值实现可变参数：

```ts
type NewSet<T> = (iterable: T[] = []) => void
```

> 注意使用参数默认值之后，TS 会自动将这个参数推导为可变参数，例如上面这个会推导为 `NewSet<T>(iterable?: T[]): void`
