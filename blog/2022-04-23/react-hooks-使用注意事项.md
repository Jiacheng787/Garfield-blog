---
slug: react-hooks-使用注意事项
title: React Hooks 使用注意事项
date: 2022-04-23T21:00
authors: [garfield]
tags: []
---

<!--truncate-->

## useState 相关

惰性初始化 State：

```jsx
// React hook 会在每次组件重新渲染的时候调用
const [count, setCount] = React.useState(ExpensiveCal());

// 如果 useState 的初始值需要通过复杂计算获取，可以传入一个函数惰性初始化
// 这个函数只会在组件挂载的时候执行一次，后续更新都不会执行
const [count, setCount] = React.useState(() => ExpensiveCal());
```

函数式更新：

```jsx
const [count, setCount] = React.useState(0);

// 下面这样虽然调用了两次
// 但由于一次渲染中获取的 count 都是闭包中老的值
// 因此最终 count 还是 1
setCount(count + 1);
setCount(count + 1);

// 如果要获取到上一次更新的值，可以使用函数式更新
// 最终 count 为 2
setCount(c => c + 1);
setCount(c => c + 1);
```

## useEffect 相关

`useEffect` 清除副作用：

```jsx
React.useEffect(() => {
	// ...
	return () => {
		// useEffect 的回调函数中可以返回一个函数
		// 这个函数会在组件卸载的时候执行
		// 用于清理各种事件监听器、定时器等
	}
}, []);
```

例如 ECharts 实现自适应：

```jsx
import * as React from "react";
import * as echarts from "echarts";

const LineChart = (props) => {
  const chartRef = React.useRef();

  React.useEffect(() => {
    const chart = echarts.init(chartRef.current);
    const option = {
      // ...
    }
    chart.setOptions(option);

    const handleResize = () => {
      chart.resize();
    }

    // 绑定 resize 事件监听器
    window.addEventListener("resize", handleResize);

    return () => {
      // 组件更新或者卸载时移除监听
      window.removeEventListener("resize", handleResize);
    }
  }, [props])
  
  return <div ref={chartRef} className="chart"></div>
}

export default React.memo(LineChart);
```

## useCallback 相关

`React.useCallback` 需要配合 `React.memo` 使用，其中任意一个单独使用是没用的。

:::tip

`React.useCallback` 使用的一个场景是：

- 一个父组件中有一个复杂的自定义组件，需要传入事件处理函数作为 prop，为避免父组件渲染导致该子组件重新渲染，使用 `React.memo` 包裹一下；
- 包裹之后发现父组件重新渲染，该子组件还是会重新渲染，这是因为事件处理函数在父组件每次渲染的时候都重新生成，因而传入子组件的 prop 变化导致 `React.memo` 失效；
- 将事件处理函数用 `React.useCallback` 包裹一下，对事件处理函数进行缓存，避免每次父组件渲染都重新生成，这样父组件重新渲染就不会导致子组件重新渲染；
- 需要注意 `React.useCallback` 缓存本身也是有性能开销的，因此只有在子组件渲染比较昂贵的时候，才进行缓存处理；

:::

## useRef 相关

不需要视图渲染的变量，不要用 `useState`：

```tsx
const App: React.FC<{}> = () => {
	// count 与视图渲染无关
	// 如果使用 useState，每次 count 变化都会触发组件重新渲染
	const [count, setCount] = React.useState(0);
	// 这里推荐使用 useRef
	const count = React.useRef(0);

	const handleClick = () => setCount(c => c + 1);

	return (
		<button onClick={handleClick}>Counter</button>
	)
}
```

在父组件定义的事件处理函数，需要作为 prop 传入子组件。如果父组件重新渲染，会导致函数重新生成，相当于 prop 发生变化，即使子组件内部使用 `React.memo()` 包裹也会导致重新渲染。常规做法是使用 `React.useCallback()` 包裹事件处理函数，但实际上用 `React.useRef()` 包裹也是可以的，都是把事件处理函数缓存到 Fiber 节点上。

```jsx
function MyApp() {
  const onClickRef = React.useRef(() => {
    console.log("666");
  });

  // const onClick = React.useCallback(() => {}, []);
  
  return (
    <div>
      <h1>Welcome to my app</h1>
      <MyButton onClick={onClickRef.current} />
    </div>
  );
}
```

:::tip

`useRef` 和 `useCallback` 的区别

`useRef` 和 `useCallback` 都可以将值缓存到 Fiber 节点的 `memorizedState` 链表上，只不过 `useCallback` 还可以接受一个依赖项数组，每次 rerender 的时候比较依赖项，决定使用缓存还是新的值，而 `useRef` 则缓存一个不可变引用，每次 rerender 的时候始终返回缓存的值。

:::

## useMemo 相关

`useMemo` 类似 Vue 中的计算属性，当依赖项发生变化，会重新计算。但实际上 `useMemo` 比计算属性更强大，除了缓存值之外，还能缓存组件：

```jsx
function Index({ value }){
  const [number, setNumber] = React.useState(0);
  const element = React.useMemo(() => <Test />, [value]);

  return (
    <div>
      {element}
      <button onClick={() => setNumber(number + 1)}>点击 {number}</button>
    </div>
  )
}
```

## 自定义 hook 相关

编写自定义 hook 注意事项，函数组件每次 rerender 的时候，实际上就是执行整个函数，函数内部的变量会重新创建、hooks 会重新执行，因此自定义 hook 内部需要对逻辑进行缓存（例如 `useEffect`、`useMemo`、`useCallback`、`useRef`），避免重复执行。
