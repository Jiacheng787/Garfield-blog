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

/**
 * 下面这样虽然调用了两次
 * 但是 React 会对状态更新进行批处理
 * 保证连续调用 setCount，状态只更新一次
 * 防止组件频繁 rerender
 * 
 * 调用 setCount 之后并不会立即更新 count
 * 所以第二次 setCount 的时候，count 值仍然是 0
 * 
 * 例如：
 * setCount(count + 1);
 * console.log(count); // 0
 * 
 * 所以下面的代码等价于：
 * setCount(0 + 1);
 * setCount(0 + 1);
 * 
 * 因此最终 count 还是 1
 */
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
    // 这个函数会在：
    // 1. 组件更新的时候执行（依赖项数组不为空 && 依赖项改变）
    // 2. 组件卸载的时候执行
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

`useEffect` 可以实现类似监听的效果，具体流程如下：

- 调用 `setState` 更新状态，同时触发调度更新
- 组件 rerender，所有 hooks 重新执行（包括 `useEffect`）
- `updateEffectImpl` 内部对 deps 进行比较，发现依赖性变化，于是执行 `create` 函数

:::tip

注意，很多同学习惯性把 `useEffect` 理解为监听，例如 _用 `useEffect` 监听某个 state 变量_，这种理解是不对的。为什么这么说呢，因为 `useEffect` 实际上只能监听 state 变量，只有 `setState` 可以触发调度更新，进而重新执行函数组件，重新执行 `useEffect`，实现监听效果；但是如果换做 ref 是无法监听的，因为修改 ref 不能触发调度更新。因此还是要从实现原理的角度去理解整个调用链路。

:::

如何理解 React Hooks 的闭包陷阱

函数组件更新，实际上就是函数重新执行，生成一个新的执行上下文，所有变量、函数重新创建，hooks 重新执行。

一般来说，当函数执行完毕，内部的变量就会销毁、被垃圾回收机制回收。当然也有例外情况，在下面的代码中，函数 `baz` 依赖了 `bar` 内部的变量 `a`，并且 `baz` 作为返回值传递给了 `foo`，因此 `a` 并不会被垃圾回收机制回收，而是会作为闭包缓存下来。只要 `foo` 的引用不解除，`a` 就会一直缓存：

```js
function bar() {
  const a = 1;
  return function baz() {
    console.log(a);
  }
}

const foo = bar();
```

再来看这个场景：`useEffect` 的回调函数依赖了 state 变量，而我们知道这个回调函数在下次 rerender 之前都是缓存在 fiber 节点上的，这样一来就创建了闭包，即使函数组件已经执行完毕，但是 state 变量仍会被缓存下来。

当组件更新的时候，会生成一个新的执行上下文，state 变量也会重新生成，但是 `useEffect` 回调函数仍然引用了旧的闭包。但是为什么 `useEffect` 依赖项变化、回调函数执行的时候，总是可以获取到新的值呢？这是因为每次函数组件重新渲染，`useEffect` 都会重新执行，回调函数也会重新生成（但不一定都会执行），在 `updateEffectImpl` 内部用重新生成的函数替换了 fiber 节点缓存的函数，这样一来，回调函数执行的时候，始终都能获取到最新的值了。

你可能会觉得这样没什么问题，但是如果在 `useEffect` 中使用定时器，大概率都会遇到闭包陷阱。

另一个会遇到闭包陷阱的是 `useCallback`。很多同学觉得 `useCallback` 依赖项似乎没什么用，习惯性传递空数组，这就会导致函数一直被缓存，假如内部依赖了 state 变量，则始终会缓存旧的闭包。正确做法应该是把 state 变量添加到依赖项数组中，在 state 改变的时候重新生成函数，这样就可以获取到最新的值。

:::tip

函数组件 rerender 过程中，缓存状态的 fiber 节点（相当于组件实例）并不会销毁，但函数组件是重新执行了，会生成一个新的上下文环境，如果 useEffect 回调依赖了 state 变量，则会一直缓存旧的闭包。所以要避免闭包陷阱，只需要 **保证每次渲染的时候，函数都重新生成** 就行。

:::

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

对于一些表单 UI，如果要实现受控组件，通常与 `useState` 进行绑定：

```tsx
const App: React.FC<{}> = () => {
  const [num, setNum] = React.useState(1);

  return (
    <InputNumber value={num} onChange={setNum} />
  )
}
```

在 Vue 项目中，涉及到表单 UI，一般都是直接全部进行数据绑定，但是在 React 中并不一定都要数据绑定：

```tsx
const App: React.FC<{}> = () => {
  // 如果使用 useState 进行数据绑定，在输入的时候，会导致组件频繁 rerender
  // 如果组件渲染比较昂贵，使用 useRef 则可以避免 rerender
  const inputRef = React.useRef("");

  const handleInputChange = (e: React.FormEvent<HTMLInputElement>) => {
    inputRef.current = e.target.value;
  }

  return (
    <Input onChange={handleInputChange} />
  )
}
```

:::tip

需不需要受控组件，还是要看场景，如果仅仅只需要在提交的时候获取表单内容，完全可以不用受控；如果表单输入要实时反映 UI 变化（例如字数统计、合法性校验等），则最好做成受控组件

:::

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

`useMemo` 类似 Vue 中的计算属性，当依赖项发生变化，会重新计算。

例如下面是一个常见的需求，有一个列表，切换下拉框选项可以调接口更新列表，在搜索框输入内容可以搜索当前列表的内容。

```tsx
const List: React.FC<{}> = () => {
  const { tableData } = useSelector(state => state.tableData);
  const dispatch = useDispatch<AppDispatch>();

  const [searchText, setSearchText] = React.useState("");

  // 将 useMemo 作为计算属性，添加 tableData 和 searchText 两个依赖项
  const dataSource = React.useMemo(() => {
    return tableData.filter(item => item.name.includes(searchText));
  }, [tableData, searchText]);

  // 当切换下拉框选项时，触发 handleSelectChange
  // 调接口更新 store 的值
  // 注意组件中使用 useSelector 做了 UI-binding
  // 因此 tableData 改变会触发组件更新
  // 由于 tableData 被添加到 useMemo 依赖项中
  // 因此 useMemo 会重新计算 dataSource
  // 进而实现切换下拉框更新列表的功能
  const handleSelectChange = (value: string) => {
    dispatch(setTableDataAction(value));
  }

  // 当搜索框输入内容时，触发 handleInputChange
  // 由于 searchText 被添加到 useMemo 依赖项中
  // 因此 searchText 改变会触发 useMemo 重新计算
  // 进而实现搜索当前列表功能
  const handleInputChange = (e: React.FormEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }

  return (
    <div>
      <div>
        <Select onChange={handleSelectChange}>
          <Option value="lucy">Lucy</Option>
        </Select>
        <Input onChange={handleInputChange} />
      </div>
      <Table
        columns={columns}
        dataSource={dataSource}
      />
    </div>
  )
}
```

但实际上 `useMemo` 比计算属性更强大，除了缓存值之外，还能缓存组件：

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
