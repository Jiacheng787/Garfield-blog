---
slug: 如何编写更好的-jsx-语句
title: 如何编写更好的 JSX 语句
date: 2022-05-14T18:20
authors: [garfield]
tags: []
---

<!--truncate-->

列表不为空的时候进行渲染：

```jsx
// 注意这种写法有 bug
// 如果 data 数组为空，则会直接渲染 `0` 到页面上
{data.length && <div>{data.map((d) => d)}</div>}

// 使用 && 的时候需要手动转换布尔值
data.length > 0 && jsx
!!data.length && jsx
Boolean(data.length) && jsx
```

不要使用 `props` 传递的 React 元素作为判断条件:

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

重新挂载还是更新：

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

[写好 JSX 条件语句的几个建议](https://mp.weixin.qq.com/s/1BX5xK0wpUDBSininJbYHw)
