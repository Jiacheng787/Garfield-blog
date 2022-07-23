---
slug: react-hooks-使用注意事项
title: React Hooks 使用注意事项
date: 2022-04-23T21:00
authors: [garfield]
tags: []
---

<!--truncate-->

## 前言

### 1) 依赖项使用注意事项

哪些变量应该放进依赖项里面：

- 与视图渲染有关的变量，例如 `props`、`state`、`context`
- 一些派生的状态，例如 `useCallback`、`useMemo` 的返回值

哪些不应该放进依赖项里面：

- 与视图渲染无关的变量，例如 `ref`

> 这是因为 `useRef` 返回的引用在整个组件生命周期中保持不变，不存在闭包陷阱问题

### 2) React 性能优化策略

引起组件更新的因素：

- props（包括父组件 rerender 引起子组件 rerender）
- state（在组件内部 `setState` 触发调度更新）
- context（全局状态改变，通知订阅状态的组件更新）

在不做任何优化的情况下，即使 props 没有改变，但是如果父组件 rerender，会导致子组件 props 对象重新生成，由于 React 默认的性能优化策略是 props **严格相等比较**，所以不可避免地导致子组件以及所有的子孙组件 rerender。

> **严格相等比较** 高效但是难命中，只有当前组件没有 rerender 才能保证后续组件树都不 rerender

使用了 `React.memo` 之后，会改为对 props 进行 **浅比较**，这样可以避免一些不必要的 rerender。

> **浅比较** 容易命中但是有一定性能开销，因为需要遍历对象

### 3) 如何排查组件 rerender

- 使用 ahooks 提供的 `useWhyDidYouUpdate`
- 使用 react devtool，点击 profiler 面板上的齿轮，然后勾选「Record why each component rendered while profiling.」

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
// 实际上函数式更新还能避免闭包陷阱
// 最终 count 为 2
setCount((c) => c + 1);
setCount((c) => c + 1);
```

## useEffect 相关

建议不要在组件上下文中放与渲染无关的逻辑，不然会影响页面渲染性能（函数组件的函数体相当于类组件的 `render` 函数）。比较好的做法是放到 `useEffect` 里面，在组件渲染后异步执行，不阻塞页面渲染。

例如调接口可能需要前端拼接参数、计算哈希值，如果放在组件上下文中，不仅每次组件 rerender 都会执行，而且会阻塞页面渲染，这样就有些得不偿失。相反如果放在 `useEffect` 中，相当于让页面优先渲染，然后再处理这些相比页面渲染而言不那么重要的逻辑，这其实也是一种状态更新优先级的思想。

:::tip

`useEffect` 与 `useLayoutEffect` 的区别：

- `useLayoutEffect` 在 **组件渲染前同步执行**，会阻塞页面渲染，可以获取更新前的 DOM 元素
- `useEffect` 在 **组件渲染后异步执行**，不阻塞页面渲染，可以获取更新后的 `state` 以及 DOM 元素

:::

### 1) `useEffect` 实现优雅异步获取数据

考虑一个常见的需求，前端需要展示一个列表，这个列表支持分页、排序，同时还能下拉筛选、搜索等。

实现的思路显然就是使用 `useEffect` 「监听」这些 state 变化，然后重新发起网络请求。我们知道 `useEffect` 的回调函数不能写成 `async` 函数（只能返回 `undefined` 或者 cleanup 函数），这种情况下我们只能这样写：

```tsx
useEffect(() => {
  $getTableData().then((res) => {
    setData(res);
  });
}, []);

// 或者
useEffect(() => {
  (async () => {
    const res = await $getTableData();
    setData(res);
  })();
}, []);
```

当逻辑很多的时候，我们会考虑单独抽提函数：

```tsx
const fetchData = async () => {
  const res = await $getTableData({
    pageSize, // 每页条数
    pageNum, // 当前页数
    asc, // 是否升序
    dropdown, // 下拉筛选
    searchText, // 搜索框
  });
  setData(res);
};

useEffect(() => {
  fetchData();
}, [pageSize, pageNum, asc, dropdown, searchText]);
```

上面这样写，逻辑上是没问题，但是这些依赖项都没有指向性。这里推荐个人觉得比较好的方式：

```tsx
const fetchData = useCallback(async () => {
  const res = await $getTableData({
    pageSize, // 每页条数
    pageNum, // 当前页数
    asc, // 是否升序
    dropdown, // 下拉筛选
    searchText, // 搜索框
  });
  setData(res);
}, [pageSize, pageNum, asc, dropdown, searchText]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

:::tip

把 `fetchData` 用 `useCallback` 包裹一下，依赖项都传给 `useCallback`，这样就比较白盒。

同时 `useEffect` 不用关心这些依赖项，只要关心 `fetchData` 函数是否重新生成，如果重新生成（说明依赖项改变），那么就重新发起请求。

:::

上面这样写显然会有很多模板代码，可以把逻辑封装为一个自定义 hook：

```tsx
export const useRequest = <T extends {}>(
  fn: () => Promise<T>,
  deps: React.DependencyList = []
) => {
  const [result, setResult] = React.useState<T>();

  const fetchData = React.useCallback(async () => {
    const result = await fn();
    setResult(result);
  }, deps);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return result;
};
```

有时候我们可能不只调用一个接口，而是需要串行调用多个接口，还可以再封装一个更加抽象的 hook：

```tsx
export const useAsync = (
  fn: () => Promise<void>,
  deps: React.DependencyList = []
) => {
  const fetchData = React.useCallback(fn, deps);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
};
```

:::tip

注意，以上只是一个简单的 demo，实际要考虑的问题有很多：

- **竞态条件**：网络请求存在不确定性，例如短时间内发两个请求，后一个先响应，页面渲染，然后过一会前一个响应，把上一次渲染的内容给覆盖了（开发阶段很难复现，React 18 严格模式下会强制组件重复挂载两次放大这个问题）
- **内存泄漏**：请求发出后组件就卸载了，请求响应之后如果继续调用 `setState` 更新已卸载组件的状态，React 会打印警告信息，提示可能存在内存泄漏
- **缓存数据**：例如用户点击返回按钮查看上一页，可以先用缓存数据渲染页面，而无需等待接口返回再渲染
- **SSR 渲染**：在服务器端（Node 环境）获取数据，这个意义上来说，`axios` 就做得很好，同时支持浏览器和 Node 环境，另外现在 Node 已经支持 `fetch API` 应该也是为了更好地支持 SSR 渲染
- **瀑布问题**：如果组件都依赖 `useEffect` 获取数据，整个渲染流程就是这样：父组件挂载 -> 父组件 `useEffect` 执行，请求数据 -> 接口响应后重新渲染父组件 -> 子组件挂载 -> 子组件 `useEffect` 执行，请求数据 -> 接口响应后重新渲染子组件。这种情况下，子组件需要等待父组件接口响应、渲染完成后再去调接口

对于更新已卸载组件状态，导致控制台打印警告信息，在 React18 中已经不需要关注了。

[React 18 对 Hooks 的影响](https://mp.weixin.qq.com/s/fgT7Kxs_0feRx4TkBe6G5Q)

对于 **竞态条件** 问题，React 官方给了一个解决方案。虽然已经发出的网络请求不能 undo，但是可以丢弃响应数据。下面代码可以保证，短时间内发出多个网络请求（此时都还未响应），只取最后一个请求的响应数据：

```tsx {2,4,9}
useEffect(() => {
  let ignore = false;
  fetchResults(query, page).then(json => {
    if (!ignore) {
      setResults(json);
    }
  });
  return () => {
    ignore = true;
  };
}, [query, page]);
```

综上，React 官方实际上更推荐使用 `swr`、`react-query` 获取数据，比自己在 `useEffect` 里面调接口更高效。

推荐阅读：

https://beta.reactjs.org/learn/synchronizing-with-effects#fetching-data

https://beta.reactjs.org/learn/you-might-not-need-an-effect#fetching-data

推荐看一下 `react-use` 中 `useAsync` 的源码：

https://github.com/streamich/react-use/blob/master/src/useAsync.ts

:::

### 2) `useEffect` 清除副作用

```jsx
React.useEffect(() => {
  // ...
  return () => {
    // useEffect 的回调函数中可以返回一个函数
    // 这个函数会在：
    // 1. 组件更新的时候执行（依赖项数组不为空 && 依赖项改变）
    // 2. 组件卸载的时候执行
    // 用于清理各种事件监听器、定时器等
  };
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
    };
    chart.setOptions(option);

    const handleResize = () => {
      chart.resize();
    };

    // 绑定 resize 事件监听器
    window.addEventListener("resize", handleResize);

    return () => {
      // 组件更新或者卸载时移除监听
      window.removeEventListener("resize", handleResize);
    };
  }, [props]);

  return <div ref={chartRef} className="chart"></div>;
};

export default React.memo(LineChart);
```

`useEffect` 可以实现类似监听的效果，具体流程如下：

- 调用 `setState` 更新状态，同时触发调度更新
- 组件 rerender，所有 hooks 重新执行（包括 `useEffect`）
- `updateEffectImpl` 内部对 deps 进行比较，发现依赖性变化，于是执行 `create` 函数

:::tip

注意，很多同学习惯性把 `useEffect` 理解为监听，例如 _用 `useEffect` 监听某个 state 变量_，这种理解是不对的。为什么这么说呢，因为 `useEffect` 实际上只能监听 state 变量，只有 `setState` 可以触发调度更新，进而重新执行函数组件，重新执行 `useEffect`，实现监听效果；但是如果换做 ref 是无法监听的，因为修改 ref 不能触发调度更新。因此还是要从实现原理的角度去理解整个调用链路。

:::

### 3) 如何理解 React Hooks 的闭包陷阱

函数组件更新，实际上就是函数重新执行，生成一个新的执行上下文，所有变量、函数重新创建，hooks 重新执行。

一般来说，当函数执行完毕，内部的变量就会销毁、被垃圾回收机制回收。当然也有例外情况，在下面的代码中，函数 `baz` 依赖了 `bar` 内部的变量 `a`，并且 `baz` 作为返回值传递给了 `foo`，因此 `a` 并不会被垃圾回收机制回收，而是会作为闭包缓存下来。只要 `foo` 的引用不解除，`a` 就会一直缓存：

```js
function bar() {
  const a = 1;
  return function baz() {
    console.log(a);
  };
}

const foo = bar();
```

再来看这个场景：`useEffect` 的回调函数依赖了 state 变量，而我们知道这个回调函数在下次 rerender 之前都是缓存在 fiber 节点上的，这样一来就创建了闭包，即使函数组件已经执行完毕，但是 state 变量仍会被缓存下来。

当组件更新的时候，会生成一个新的执行上下文，state 变量也会重新生成，但是 `useEffect` 回调函数仍然引用了旧的闭包。但是为什么 `useEffect` 依赖项变化、回调函数执行的时候，总是可以获取到新的值呢？这是因为每次函数组件重新渲染，`useEffect` 都会重新执行，回调函数也会重新生成（但不一定都会执行），在 `updateEffectImpl` 内部用重新生成的函数替换了 fiber 节点缓存的函数，这样一来，回调函数执行的时候，始终都能获取到最新的值了。

你可能会觉得这样没什么问题，但是如果在 `useEffect` 中使用定时器，大概率都会遇到闭包陷阱。

另一个会遇到闭包陷阱的是 `useCallback`。很多同学觉得 `useCallback` 依赖项似乎没什么用，习惯性传递空数组，这就会导致函数一直被缓存，假如内部依赖了 state 变量，则始终会缓存旧的闭包。正确做法应该是把 state 变量添加到依赖项数组中，在 state 改变的时候重新生成函数，这样就可以获取到最新的值。

:::tip

缓存的作用原本是为了提升性能，例如 `useCallback` 可以避免不必要的 rerender，但是却导致了闭包陷阱。

函数组件 rerender 过程中，缓存状态的 fiber 节点（相当于组件实例）并不会销毁，但函数组件是重新执行了，会生成一个新的上下文环境，如果 useEffect 回调依赖了 state 变量，则会一直缓存旧的闭包。所以要避免闭包陷阱，只需要 **保证每次渲染的时候，都用重新生成的函数更新缓存** 就行。

一般来说，只要正确添加依赖项，就可以解决大部分闭包陷阱问题。对于 `useEffect` 中定时器导致的闭包陷阱，有以下两种解决方案：

- 每次执行 `useEffect` 先销毁上一次的定时器，再重新创建定时器
- 使用 ref 创建不可变引用，可以参考 ahooks 中 `useLatest` 的实现
  https://ahooks.js.org/hooks/use-latest

另外 React 官方团队有一个关于 `useEvent` 的 RFC，用于解决事件处理函数的闭包陷阱问题。很多开源 Hooks 库已经实现类似功能（比如 ahooks 中的 `useMemoizedFn`），`useEvent` 定位于 **处理事件回调函数** 这一单一场景，在 React 18 并发渲染下可以确保稳定更新。

[React 官方团队出手，补齐原生 Hook 短板](https://juejin.cn/post/7094424941541457933)

:::

## useCallback 相关

`React.useCallback` 需要配合 `React.memo` 使用，其中任意一个单独使用是没用的。

`React.useCallback` 的使用场景：

- 一个父组件中有一个复杂的自定义组件，需要传入事件处理函数作为 prop，为避免父组件渲染导致该子组件重新渲染，使用 `React.memo` 包裹一下；
- 包裹之后发现父组件重新渲染，该子组件还是会重新渲染，这是因为事件处理函数在父组件每次渲染的时候都重新生成，因而传入子组件的 prop 变化导致 `React.memo` 失效；
- 将事件处理函数用 `React.useCallback` 包裹一下，对事件处理函数进行缓存，避免每次父组件渲染都重新生成，这样父组件重新渲染就不会导致子组件重新渲染；
- 需要注意 `React.useCallback` 缓存本身也是有性能开销的，因此只有在子组件渲染比较昂贵的时候，才进行缓存处理；

:::tip

明确一下，函数组件 rerender，内部事件处理函数都重新生成，这是无法避免的。`useCallback` 做的事情有两个：

- 依赖项不变的时候缓存函数（避免 props 改变导致子组件重新渲染）
- 依赖项改变的时候用重新生成的函数更新缓存（避免出现闭包陷阱）

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

  const handleClick = () => setCount((c) => c + 1);

  return <button onClick={handleClick}>Counter</button>;
};
```

对于一些表单 UI，如果要实现受控组件，通常与 `useState` 进行绑定：

```tsx
const App: React.FC<{}> = () => {
  const [num, setNum] = React.useState(1);

  return <InputNumber value={num} onChange={setNum} />;
};
```

在 Vue 项目中，涉及到表单 UI，一般都是直接全部进行数据绑定，但是在 React 中并不一定都要数据绑定：

```tsx
const App: React.FC<{}> = () => {
  // 如果使用 useState 进行数据绑定，在输入的时候，会导致组件频繁 rerender
  // 如果组件渲染比较昂贵，使用 useRef 则可以避免 rerender
  const inputRef = React.useRef("");

  const handleInputChange = (e: React.FormEvent<HTMLInputElement>) => {
    inputRef.current = e.target.value;
  };

  return <Input onChange={handleInputChange} />;
};
```

:::tip

需不需要受控组件，还是要看场景，如果仅仅只需要在提交的时候获取表单内容，完全可以不用受控；如果表单输入要实时反映 UI 变化（例如字数统计、合法性校验等），则最好做成受控组件

:::

在父组件定义的事件处理函数，需要作为 prop 传入子组件。如果父组件重新渲染，会导致函数重新生成，相当于 prop 发生变化，即使子组件内部使用 `React.memo()` 包裹也会导致重新渲染。常规做法是使用 `React.useCallback()` 包裹事件处理函数，有同学会问，用 `React.useRef()` 包裹可以吗？`useRef` 确实也可以把事件处理函数缓存到 fiber 节点上，但不建议这么做，因为即使 state 变量更新，`useRef` 仍然返回缓存的函数，不会用新生成的函数替换，导致闭包陷阱：

```jsx
function MyApp() {
  const [count, setCount] = React.useState(0);

  /**
   * 使用 useCallback 缓存函数
   * 这里注意，如果函数内部依赖了 state 变量
   * 又没有添加到依赖项数组中
   * 会导致闭包陷阱，无法获取到最新的值
   */
  const handleClick = React.useCallback(() => {
    console.log(count);
  }, [count]);

  /**
   * useRef(fn) 实际上就相当于 useCallback(fn, [])
   * 始终调用 fiber 节点缓存的函数
   * 因此如果函数内部依赖了 state 变量
   * 则必然导致闭包陷阱
   * 因此不推荐用 useRef 缓存函数
   * 除非你能在每次 rerender 的时候更新 current
   */
  const onClickRef = React.useRef(() => {
    console.log(count);
  });

  return (
    <div>
      <h1>Welcome to my app</h1>
      <MyButton onClick={handleClick} />
    </div>
  );
}
```

:::tip

`useRef` 和 `useCallback` 的区别

`useRef` 和 `useCallback` 都可以将值缓存到 Fiber 节点的 `memorizedState` 链表上，只不过 `useCallback` 还可以接受一个依赖项数组，每次 rerender 的时候比较依赖项，如果依赖项改变，则用重新生成的函数替换 Fiber 节点缓存的值，使得函数内部可以访问到最新的值，而 `useRef` 则缓存一个不可变引用，每次 rerender 的时候始终返回缓存的值。

:::

## useMemo 相关

`useMemo` 类似 Vue 中的计算属性，当依赖项发生变化，会重新计算。

例如下面是一个常见的需求，有一个列表，切换下拉框选项可以调接口更新列表，在搜索框输入内容可以搜索当前列表的内容。

```tsx
const List: React.FC<{}> = () => {
  const { tableData } = useSelector((state) => state.tableData);
  const dispatch = useDispatch<AppDispatch>();

  const [searchText, setSearchText] = React.useState("");

  // 将 useMemo 作为计算属性，添加 tableData 和 searchText 两个依赖项
  const dataSource = React.useMemo(() => {
    return tableData.filter((item) => item.name.includes(searchText));
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
  };

  // 当搜索框输入内容时，触发 handleInputChange
  // 由于 searchText 被添加到 useMemo 依赖项中
  // 因此 searchText 改变会触发 useMemo 重新计算
  // 进而实现搜索当前列表功能
  const handleInputChange = (e: React.FormEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  return (
    <div>
      <div>
        <Select onChange={handleSelectChange}>
          <Option value="lucy">Lucy</Option>
        </Select>
        <Input onChange={handleInputChange} />
      </div>
      <Table columns={columns} dataSource={dataSource} />
    </div>
  );
};
```

但实际上 `useMemo` 比计算属性更强大，除了缓存值之外，还能缓存组件：

```jsx
function Index({ value }) {
  const [number, setNumber] = React.useState(0);
  const element = React.useMemo(() => <Test />, [value]);

  return (
    <div>
      {element}
      <button onClick={() => setNumber(number + 1)}>点击 {number}</button>
    </div>
  );
}
```

:::tip

建议 `useMemo` **只用于性能优化，不要与逻辑耦合**。

例如，需要在组件挂载的时候生成一个唯一 id，并且要保证组件整个生命周期中都不变。下面这样虽然看起来没问题，但是如果去掉 `useMemo`，整个逻辑就变了，组件每次 rerender 就会生成一个新的 id，因此下面这种就与逻辑耦合了：

```tsx
const appId = React.useMemo(() => APP_PREFIX + nanoid(), []);
```

> 记得之前看过一篇文章讲实现一个 Babel 插件，移除代码中的 `useMemo`，用来确保即使 `useMemo` 移除后，代码逻辑还是不变

需要怎么实现比较合理呢？一种方案是使用 `useRef`：

```tsx
const appIdRef = React.useRef(APP_PREFIX + nanoid());
```

上面这样确实比较合理了，但是导致了一个性能问题。`useRef` 的初始值只会在组件挂载的时候获取一次，后续 rerender 都不会用到，但是 `nanoid()` 却在每次 rerender 的时候都会执行，即使根本没用，这样就非常不合理了。

这种情况就不能用 `useRef`，我们可以使用 `useState` 惰性初始化的特性：

```tsx
const [appId] = React.useState(() => APP_PREFIX + nanoid());
```

:::

## 自定义 hook 相关

编写自定义 hook 注意事项，函数组件每次 rerender 的时候，实际上就是执行整个函数，函数内部的变量会重新创建、hooks 会重新执行，因此自定义 hook 内部需要对逻辑进行缓存（例如 `useEffect`、`useMemo`、`useCallback`、`useRef`），避免重复执行。

## forwardRef && useImperativeHandle

函数组件的 `ref` 属性只能用在 dom 元素上，不能用在组件上，因为函数组件没有实例，所以函数组件无法像类组件一样可以接收 `ref` 属性。

`forwardRef` 可以将父组件中的 `ref` 对象转发到子组件中的 dom 元素上，从而在父组件获取子组件的 ref 对象。此时，子组件接受 props 和 ref 作为参数。

在大多数情况下，应当避免使用 `ref` 这样的命令式代码。`useImperativeHandle` 可以让你在使用 `ref` 时，自定义暴露给父组件的实例值，不能让父组件想干嘛就干嘛。此外父组件可以使用操作子组件中的多个 `ref`。建议 `useImperativeHandle` 应当与 `forwardRef` 一起使用。
