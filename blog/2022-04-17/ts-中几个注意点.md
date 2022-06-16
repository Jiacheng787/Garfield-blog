---
slug: ts-中几个注意点
title: TS 中几个注意点
date: 2022-04-17T11:27
authors: [garfield]
tags: [TypeScript]
---

<!--truncate-->

## 非空断言 & 类型守卫

TS 会帮助检查各种潜在的空指针问题，通常有两种方式处理：**TS 非空断言**，**类型守卫**。

- 使用 TS 非空断言，等于是告诉 TS 忽略空指针检查，无法真正避免空指针
- 而类型守卫是真正从逻辑层面处理空指针问题

建议尽可能少用 TS 非空断言，而是使用类型守卫的方式，这样可以避免很多空指针问题。

TS 如何优雅规避空异常？考虑下面这个场景，`submitList` 的类型定义为 `string[] | null`：

```ts
render: (_, record) => {
  const { submitList } = record;
  
  // 此处会报 Object is possibly 'null'.
  if (submitList.length === 0) {
    return <>未提交</>;
  }
  
  return (
    <div>
      {/* 此处会报 Object is possibly 'null'. */}
      {submitList.map((item, index) => {
        return <span key={index}>{item}</span>
      })}
    </div>
  )
}
```

遇到这些空异常，很多同学可能习惯用 TS 非空断言解决问题，但实际上，这是 TS 在提示你注意空指针问题，用了非空断言等于手动关闭 TS 空异常检查。

那么如何处理空异常呢？有的同学可能会想用解构默认值：

```ts
const { submitList = [] } = record;
```

这里要注意一个问题， 参数默认值、解构默认值只有在严格等于 `undefined` 才会生效，即使是 `null` 也不会生效。因此这样处理显然是不行的。

处理空异常最优雅的做法就是类型守卫：

```ts
render: (_, record) => {
  const { submitList } = record;
  
  if (submitList === null || submitList.length === 0) {
    return <>未提交</>;
  }
  
  return (
    <div>
      {submitList.map((item, index) => {
        return <span key={index}>{item}</span>
      })}
    </div>
  )
}
```

## TS 类型定义

TS 声明文件中定义的 `type` 和 `interface` 可以全局使用。但是需要注意普通 ts 模块定义的 `type` 和 `interface` 只能在当前模块访问，如果需要在其他模块使用，需要先 `export type` 导出类型，然后 `import type` 进行导入。

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

## 常量断言

在讲常量断言之前，先提一下，TS 会区别对待可修改和不可修改的值的类型推断：

```ts
// 推断成单值类型 'dbydm'
const immutable = 'dbydm';

// 推断成通用的 string 类型
let mutable = 'dn';

// 由于对象的属性都具有可修改性，TS 都会对它们「从宽」类型推断
// 例如下面的 prop 的类型被推断为 string
const obj = { prop: 'foo' }
```

再来看下面的代码，例如我们实现了一个用 ref 维护状态的 hook：

```ts
import * as React from "react";

const useRenderlessState = <T>(initialState: T) => {
  const stateRef = React.useRef(initialState);

  const setState = (nextState: T) => stateRef.current = nextState;

  return [stateRef.current, setState];
}
```

此时我们会发现上面 hook 的返回值的类型被推导成了如下的数组类型：

```ts
(T | ((nextState: T) => T))[]
```

这就导致我们在使用的时候无法对它进行准确的解构：

```ts
const [value, setValue] = useRenderlessState(0);
```

一般来说我们可以 **显示声明返回类型** 或者 **对返回值做类型断言**，告诉 TS 返回值类型是元组而不是数组：

```ts
// 显示声明返回类型
const useRenderlessState = <T>(initialState: T): [T, (nextValue: T) => T] => {/*...*/}

// 对返回值对类型断言
const useRenderlessState = <T>(initialState: T) => {
  // ...
  return [state, setState] as [typeof value, typeof setValue];
}
```

上面的两种写法都各有冗余成分，算不上优雅。

其实从语义层面来分析，TS 之所以没能将返回值推断为元组类型是因为它认为该返回值仍有可能被 push 值，被修改。所以我们真正需要做的是告诉 TS，这个返回值是一个 final，其本身和属性都是不可篡改的，而这正是常量断言所做的事。

常量断言可以把一个值标记为一个不可篡改的常量，从而让 TS 以最严格的策略来进行类型推断：

```ts
const useRenderlessState = <T>(initialState: T) => {
  // ...
  return [state, setState] as const
}
```

这下 `useRenderlessState` 的返回类型就被推断成了如下的 readonly 值：

```ts
readonly [T, (nextState: T) => T]
```

:::tip

`as const` 与 ES6 `const` 常量声明的区别：

- `const` 常量声明是 ES6 的语法，对 TS 而言，它只能反映该常量本身是不可被重新赋值的，它的子属性仍然可以被修改，故 TS 只会对它们做松散的类型推断
- `as const` 是 TS 的语法，它告诉 TS 它所断言的值以及该值的所有层级的子属性都是不可篡改的，故对每一级子属性都会做最严格的类型推断（所有的字面量都会被推断为单值类型）

常量断言可以让我们不需要 `enum` 关键字就能定义枚举对象：

```ts
const EnvEnum = {
  DEV: "development",
  PROD: "production",
  TEST: "test",
} as const;
```

:::

[TypeScript 夜点心：常量断言](https://zhuanlan.zhihu.com/p/121558249)
