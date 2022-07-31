---
slug: 如何编写更好的-jsx-语句
title: 如何编写更好的 JSX 语句
date: 2022-05-14T18:20
authors: [garfield]
tags: []
---

<!--truncate-->

## 列表不为空的时候进行渲染

```jsx
// 注意这种写法有 bug
// 如果 data 数组为空，则会直接渲染 `0` 到页面上
{data.length && <div>{data.map((d) => d)}</div>}

// 使用 && 的时候需要手动转换布尔值
data.length > 0 && jsx
!!data.length && jsx
Boolean(data.length) && jsx
```

:::tip

从这里可以看出，`false`、`null`、`[]` 这些值不会被渲染出来，但是 `0` 会被渲染出来，所以在处理列表渲染的时候需要特别注意。

:::

## 不要使用 `props` 传递的 React 元素作为判断条件

```jsx
// 这样的判断不准确
// props.children 可能是一个空数组 []
// 使用 children.length 也不严谨，因为 children 也可能是单个元素
// 使用 React.Children.count(props.children) 支持单个和多个 children
// 但是对于存在多个无效节点，例如 false 无法准确判断
// 使用 React.Children.toArray(props.children) 可以删除无效节点
// 但是对于一个空片段，例如 <></> 又会被识别为有效的元素
// 所以为了避免出错，建议不要这样判断
const Wrap = (props) => {
  if (!props.children) return null;
  return <div>{props.children}</div>
};
```

:::tip

`React.Children` 提供了用于处理 `this.props.children` 不透明数据结构的实用方法。

:::

## 重新挂载还是更新

```jsx
// 使用三元运算符分支编写的 JSX 看上去就像完全独立的代码
{hasItem ? <Item id={1} /> : <Item id={2} />}

// 但实际上 hasItem 切换时，React 仍然会保留挂载的实例，然后更新 props
// 因此上面的代码实际上等价于下面这样
<Item id={hasItem ? 1 : 2} />

// 一般来讲不会有什么问题，但是对于非受控组件，就可能导致 bug
// 例如 mode 属性变化，会发现之前输入的信息还在
{mode === 'name'
    ? <input placeholder="name" />
    : <input placeholder="phone" />}

// 由于 React 会尽可能复用组件实例
// 因此我们可以传递 key，告诉 React 这是两个完全不一样的元素，让 React 强制重新渲染
{mode === 'name'
    ? <input placeholder="name" key="name" />
    : <input placeholder="phone" key="phone" />}

// 或者使用 && 替代三元运算符
{mode === 'name' && < input  placeholder = "name" /> } 
{mode !== 'name' && < input  placeholder = "phone" /> }

// 相反，如果在同一个元素上的逻辑条件不太一样
// 可以试着将条件拆分为两个单独的 JSX 提高可读性
<Button
  aria-busy={loading}
  onClick={loading ? null : submit}
>
  {loading ? <Spinner /> : 'submit'}
</Button>

// 可以改为下面这样
{loading
  ? <Button aria-busy><Spinner /></Button>
  : <Button onClick={submit}>submit</Button>}

// 或者使用 &&
{loading && <Button key="submit" aria-busy><Spinner /></Button>}
{!loading && <Button key="submit" onClick={submit}>submit</Button>}
```

## 优雅实现条件渲染

首先先准备两个组件：

```tsx
const Teach: React.FC = () => {
	return <div>2333</div>
}

const Study: React.FC = () => {
	return <div>666</div>
}
```

通常处理条件渲染我们是这样做的：

```tsx
enum DisplayTypeEnum {
  TEACH = 1,
  LEARN,
}

type IProps = {
	displayType: DisplayTypeEnum;
}

const App: React.FC<IProps> = ({ displayType }) => {
  return (
    <div>
      {
        displayType === DisplayTypeEnum.TEACH
        ? <Teach />
        : displayType === DisplayTypeEnum.LEARN
          ? <Study />
          : null
      }
    </div>
  )
}
```

如果需要判断的条件很多，上面这样会导致代码难以维护，我们可以使用策略模式优化代码：

```tsx
const App: React.FC<IProps> = ({ displayType }) => {
  // 注意，这里有个坑
  const mapper = {
    [DisplayTypeEnum.TEACH]: <Teach />,
    [DisplayTypeEnum.LEARN]: <Study />
  }

  return <div>{mapper[displayType]}</div>
}
```

上面这样写，看起来没问题，但实际上有个坑，在条件渲染的场景下，我们只需要 **挂载需要渲染的组件**，但是上面这样的结果，`mapper` 中所有组件都挂载了，即使不需要用于页面渲染，可能会导致性能问题。我们可以看一下编译后的结果：

```tsx
const App = ({
  displayType
}) => {
  const mapper = {
    [DisplayTypeEnum.TEACH]: /*#__PURE__*/React.createElement(Teach, null),
    [DisplayTypeEnum.LEARN]: /*#__PURE__*/React.createElement(Study, null)
  };
  return /*#__PURE__*/React.createElement("div", null, mapper[displayType]);
};
```

:::tip

当我们把组件写成 `<Teach />` 形式，会编译成 `React.createElement(Teach, null)` 调用的形式，这实际上就是在挂载组件。

那为啥上面我们写条件判断的时候没有这个问题呢？这是因为条件判断如果为假，根本不会执行 `React.createElement()` 函数，因此条件判断是按需挂载的。

:::

因此，这种情况下，我们需要延迟组件的挂载。延迟挂载最简单的方法就是不写成 `<Teach />` 形式：

```tsx
const App: React.FC<IProps> = ({ displayType }) => {
  const mapper = {
    [DisplayTypeEnum.TEACH]: Teach,
    [DisplayTypeEnum.LEARN]: Study
  }

  const Comp = mapper[displayType]

  // 延迟组件挂载，到渲染的时候再去挂载组件
  return <div><Comp /></div>
}
```

假如不写成标签形式，可能看不出来这是组件，这边推荐一种比较好的做法，保留 JSX 标签形式，但是包裹一层函数实现组件延迟挂载：

```tsx
const App: React.FC<IProps> = ({ displayType }) => {
  const mapper = {
    [DisplayTypeEnum.TEACH]: (props) => <Teach {...props} />,
    [DisplayTypeEnum.LEARN]: (props) => <Study {...props} />
  }

  const Comp = mapper[displayType]

  return <div><Comp /></div>
}
```

更进一步，由于我们已经实现了组件延迟挂载，因此可以把 `mapper` 抽提到组件外面，避免组件每次 rerender 都重新生成：

```tsx
const mapper = {
  [DisplayTypeEnum.TEACH]: (props) => <Teach {...props} />,
  [DisplayTypeEnum.LEARN]: (props) => <Study {...props} />
}

const App: React.FC<IProps> = ({ displayType }) => {
  const Comp = mapper[displayType]

  return <div><Comp /></div>
}
```

综上，当我们把组件写成 JSX 标签，会编译为 `React.createElement()` 调用的形式，这实际上就是在挂载组件。在条件渲染场景下，我们需要实现组件延迟挂载，即只在渲染的时候挂载需要的组件。实现组件延迟挂载，最简单的方式就是不用 JSX 标签，例如 `Teach`，此外还可以包裹一层函数实现延迟挂载，例如 `() => <Teach />`，但是要注意，直接 `<Teach />` 这样写是不对的。

## 处理节点下无 `children` 的情况

有些时候某个节点下没有子节点，看到有些同事是这样写的：

```tsx
<div id="_app"></div>

<Comp></Comp>
```

但实际上我们知道，JSX 只是一种编译时语法糖（更准确说是一种领域特定语言），在节点下没有子节点的时候，我们可以写成自闭合标签的形式：

```tsx
<div id="_app" />

<Comp />
```

我们可以在 Babel Playground 看一下编译后的结果，以上两种编译结果完全等价：

```tsx
React.createElement("div", { id: "_app" });

React.createElement(Comp, null);
```

> https://www.babeljs.cn/repl

## 参考

[写好 JSX 条件语句的几个建议](https://mp.weixin.qq.com/s/1BX5xK0wpUDBSininJbYHw)
