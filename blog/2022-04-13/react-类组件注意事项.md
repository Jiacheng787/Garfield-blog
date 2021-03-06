---
slug: react-类组件注意事项
title: React 类组件注意事项
date: 2022-04-13T21:36
authors: [garfield]
tags: [React]
---

<!--truncate-->

## 1. 为了避免组件不必要的 rerender，建议继承 `PureComponent`

```jsx
class MyCompoment extends React.PureComponent {
  // ...
}
```

> `PureComponent` 相当于函数组件使用 `React.memo`

## 2. 在构造方法中如要使用 `this`，则必须先调用 `super()`

```jsx
class MyCompoment extends React.Component {
  constructor(props) {
    // 如果想在构造方法中使用 this，则必须先调用 super()
    // super 实际上就是父类构造方法，类似盗用构造函数继承
    // 下面是一个声明 state 的例子
    super(props);
    this.state = {
      // ...
    }
  }
}
```

如果使用 ES2022 Class Properties 语法，则可以直接干掉构造方法，更加简洁：

```jsx
class MyCompoment extends React.Component {
  // 使用 ES2022 Class Properties 语法
  state = {
    // ...
  }
}
```

:::tip

注意：需要确保编译工具正确配置 `@babel/plugin-proposal-class-properties` 语法插件，才能使用 Class Properties 语法。

由于该语法已经纳入 ES2022 标准，所以使用 `@babel/preset-env` 就可以无需单独配置。

在 Vite 打包的项目中，`@vitejs/plugin-react` 也内置了 Class Properties 语法插件，无需配置可以直接使用。

:::

## 3. 状态更新可能是异步的

React 可能会对多次 `setState()` 调用进行批处理，使组件只更新一次，因此 `this.props` 和 `this.state` 可能会异步更新。所以不能依赖 `this.state` 计算下一个状态，这种情况下，可以使用函数式更新：

```jsx
this.setState((prevState, prevProps) => ({
  counter: prevState.counter + prevProps.increment
}));
```

## 4. 不需要视图渲染的变量，不要放在 `state` 里面

在函数组件中，每次调用 `setState` 就会触发调度更新，进而组件 rerender，更新视图。因此，有一些不需要视图渲染的变量，我们通常用 `useRef` 缓存而不是 `useState`。

我们知道，函数组件 rerender，其实就是执行整个函数体，内部 hooks 都会重新执行，整个执行上下文都会销毁，重新创建。与函数组件不同，类组件的 `constructor` 只会在组件实例初始化的时候执行一次，所有实例属性、方法也是初始化一次，后续组件 rerender 的时候，只有 `render` 函数重复执行。

与函数组件类似，类组件中与视图渲染无关的变量，也不应该放在 `state` 中，而是作为普通实例属性，否则每次 `setState` 都会触发组件 rerender，进而引起性能问题。

## 5. 类组件如何获取更新后的状态

与函数组件类似，类组件 `setState` 也是异步的（在事件处理函数上下文中）。在函数组件中，`useEffect` 是组件更新后异步执行，可以获取到更新后的状态，在类组件中，有两个地方可以获取更新后的状态，一个是 `setState` 回调函数，另一个是 `componentDidUpdate` 钩子。

## 6. 注意事件处理函数的 `this` 绑定问题

一般标准的写法是这样：

```jsx
class MyCompoment extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    console.log('===点击事件');
  }

  render() {
    return (
      <button onClick={this.handleClick}>点击</button>
    )
  }
}
```

如果觉得每次都要绑定 `this` 太麻烦，可以使用箭头函数：

```jsx
class MyCompoment extends React.Component {
  handleClick() {
    console.log('===点击事件');
  }

  render() {
    return (
      <button onClick={() => this.handleClick}>点击</button>
    )
  }
}
```

:::tip

如果事件处理函数需要作为 prop 传入子组件，这样写就不合适了，由于每次 render 的时候函数都重新生成，相当于 prop 发生变化，会导致子组件重新渲染

:::

如果使用 ES2022 Class Properties 语法，也可以让语法更简洁：

```jsx
class MyCompoment extends React.Component {
  handleClick = () => {
    console.log('===点击事件');
  }

  render() {
    return (
      <button onClick={this.handleClick}>点击</button>
    )
  }
}
```

Class Properties 实际上是一个编译时语法糖。如果不想配置语法插件，还有一种方案，把事件处理函数定义在构造方法里面：

```jsx
class MyCompoment extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = () => {
      console.log('===点击事件');
    }
  }
  
  render() {
    return (
      <button onClick={this.handleClick}>点击</button>
    )
  }
}
```
:::tip

相比于盗用构造函数继承，在原型链继承和组合继承中，子类通过原型 prototype 来复用父类的方法和属性，如果子类实例每次都创建新的方法与属性，那么在子类实例很多的情况下，内存中就存在有很多重复的方法和属性，即使这些方法和属性完全一样，因此这部分内存完全可以通过复用来优化，这也是享元模式的思想。

这里要注意，上面代码中类组件的事件处理函数，实际上都是对象（组件实例）的自有属性，并不是挂在原型对象上的。也就是说，这种方式其实违背了享元模式，每次创建组件实例，都会重新创建事件处理函数，并不能够实现复用。

:::

<!--

> 能否进一步简化使用构造函数？不行，因为构造函数不能继承，如果不继承的话，`setState`、`forceUpdate` 这些方法就访问不到了，当然如果自己通过寄生组合继承的方式搞一下也不是不行

-->

## 7. 关于 `this` 的几个注意点

### 1) 箭头函数中 `this` 指向能否改变

以下引用阮一峰 ES6 教程：

> 箭头函数没有自己的 `this` 对象，内部的 `this` 就是定义时上层作用域中的 `this`。也就是说，箭头函数内部的 `this` 指向是固定的，相比之下，普通函数的 `this` 指向是可变的

看了上面这段描述，很多同学可能都认为，箭头函数的 `this` 是无法改变的，但实际上箭头函数的 `this` 是跟着上层作用域走的，只要上层作用域的 `this` 改变，箭头函数中的 `this` 也会相应改变：

```js
function foo() {
  const bar = () => {
    // 箭头函数的 this 来自 foo 函数
    console.log(this.name);
  }
  bar();
}

const o1 = { name: "2333" };
const o2 = { name: "666" };

foo.bind(o1)(); // 2333
foo.bind(o2)(); // 666
```

如果将上述代码编译为 ES5 就能很容易理解上述过程：

```js
function foo() {
  var _this = this;
  var bar = function() {
    console.log(_this.name);
  }
  bar();
}
```

<!--

### 2) 为什么类组件事件处理函数需要绑定 `this`

在 `this` 隐式绑定中，有一个原则：谁调用就指向谁。例如：

```js
var a = 2333;

var obj = {
  a: 666,
  fn: function() {
    console.log(this.a);
  }
}

// 由 obj 对象调用
obj.fn(); // 666

// 由 window 对象调用
var fn2 = obj.fn;
fn2(); // 2333
```

-->

### 2) 为什么“类方法”可以使用箭头函数

在博客中看到有这样的代码：

```js
class Person {
  constructor(name) {
    this.name = name;
  }

  getName = () => {
    console.log(this.name);
  }
}
```

咋一看好像没有问题，但是仔细一想发现不对，原型对象在所有实例之间是共享的，因此类方法的 `this` 必须要动态绑定，而箭头函数的 `this` 是静态的，这样不就有 bug 了，但是试验发现并没有问题：

```js
const p1 = new Person("2333");
p1.getName(); // 2333
const p2 = new Person("666");
p2.getName(); // 666
```

这是因为，`getName` 实际并不是类方法，而是 ES2022 Class Properties 的写法，`getName` 实际上是一个对象的自有属性，可以使用下面的代码证明：

```js
Object.prototype.hasOwnProperty.call(p1, "getName"); // true
```

这一点在 React 文档事件处理函数 `this` 绑定中也有说明：

```jsx
class Foo extends Component {
  // Note: this syntax is experimental and not standardized yet.
  handleClick = () => {
    console.log('Click happened');
  }
  render() {
    return <button onClick={this.handleClick}>Click Me</button>;
  }
}
```

> https://reactjs.org/docs/faq-functions.html#how-do-i-bind-a-function-to-a-component-instance

而类方法有且仅有下面这种写法：

```js
class Person {
  constructor(name) {
    this.name = name;
  }

  getName() {
    console.log(this.name);
  }
}
```

使用箭头函数作为类属性时，绑定 `this` 的过程如下：

```js
function Person(name) {
  this.name = name;
  this.getName = () => {
    console.log(this.name);
  }
}

const o = {};
Person.bind(o)("2333");
o.getName(); // 2333
```

> 在 `new` 调用过程中，`Person` 函数的 `this` 会绑定到实例对象上，箭头函数的 `this` 就是 `Person` 函数的 `this`，因此箭头函数的 `this` 会指向实例对象，并且由于箭头函数作为类的自有属性，会在每次 `new` 的时候重新生成，因此不同实例之间不会影响

