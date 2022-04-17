---
slug: 从前端角度谈谈单页应用的-nginx-配置
title: 从前端角度谈谈单页应用的 nginx 配置
date: 2022-04-17T17:08
authors: [garfield]
tags: []
---

<!--truncate-->

很多同学可能都认为，配置 nginx 应该是后端做的呀。但实际上如果让后端同事配置 nginx，他可能是这样配的：

```bash
server {
    listen       80;
    server_name  localhost;

    location / {
        root   /app/build; # 打包的路径
        index  index.html index.htm;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

这样的配置看似没问题，但是里面存在很多只有前端同事知道的细节问题。下面我们一起来看下。

<!-- 最近有段时间没搞项目部署了，结果在部署前端项目的时候，访问页面路由（不是根路径），nginx 响应都是 404，直接访问页面根路径，路由跳转到前端的 404 页面，排查了半天，这里再总结一下。 -->

## 1. 路由访问 404 问题

问题1：按上面的配置配好了，访问页面、路由跳转都正常，但是在非跟路径下刷新页面，nginx 直接响应 404 了。

前端单页应用路由分两种：哈希模式和历史模式。

哈希模式部署不会遇到啥问题（对 nginx 来说都是根路径访问，fragment 直接忽略掉了），但是一般只用于本地、测试环境调试，没人直接部署到生产环境。

历史模式就是正常的 URL，路由跳转通过 `pushState` 和 `replaceState` 实现，不会触发浏览器刷新页面，不会给服务器发送请求，且会触发 `popState` 事件，进而监听路由变化渲染相应页面组件，因此可以实现纯前端路由。同时路由也会被浏览器历史记录栈给记录下来，因此也能实现前进后退。

需要注意，使用历史模式的时候，还是有两种情况会导致浏览器发送请求给服务器：

- 输入地址直接访问
- 刷新页面

在这两种情况下，如果当前地址不是根路径，因为都是前端路由，服务器端根本不存在对应的文件，则会直接导致 nginx 直接响应 404。因此需要在服务器端进行配置：

```bash
server {
    listen       80;
    server_name  localhost;

    location / {
        root   /app/build; # 打包的路径
        index  index.html index.htm;

        # history 模式重点就是这里
        try_files $uri $uri/ /index.html;
    }
}
```

:::tip

`try_files` 的作用就是按顺序检查文件是否存在，返回第一个找到的文件。`$uri` 是 nginx 提供的变量，指当前请求的 URI，不包括任何参数。

当请求静态资源文件的时候，命中 `$uri` 规则；当请求页面路由的时候，命中 `/index.html` 规则。

:::

这里顺便提一下，有时候 nginx 配置是正确了，但是如果直接访问页面根路径，会跳转到前端的 404 页面，这完全是前端路由配置问题。前端路由配置的时候，没有给根路径 `/` 配置规则，而对匹配不到路由的时候，配置了 404 页面，所以访问根路径会重定向到 404 页面，这个跳转是前端操作，与 nginx 无关。正常来说，前端路由配置的时候，都会给根路径 `/` 加一个匹配规则，例如根路径重定向到 `index` 路由，可以确保用户访问根路径可以正常展示页面。

## 2. 非根路径部署访问 404 问题

问题2：在部署的时候不使用根路径，例如希望通过这样的路径去访问 `/i/top.gif`，如果直接修改 `location` 发现 nginx 还会响应 404：

```bash
location /i/ {
  root /data/w3;
  try_files $uri $uri/ /index.html;
}
```

:::tip

这是因为 `root` 是直接拼接 `root` + `location`，访问 `/i/top.gif`，实际会查找 `/data/w3/i/top.gif` 文件

:::

这种情况下推荐使用 `alias`：

```bash
location /i/ {
  alias /data/w3;
  try_files $uri $uri/ /index.html;
}
```

:::tip

`alias` 是用 `alias` 替换 `location` 中的路径，访问 `/i/top.gif`，实际会查找 `/data/w3/top.gif` 文件

:::

## 3. 接口请求代理

问题3：现在页面部署成功了，但是接口请求报 404。

这是因为还没有对接口请求进行代理，下面配置一下：

```bash
location ^~ /prod-api/ {
	proxy_set_header Host $http_host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header REMOTE-HOST $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_pass http://192.168.31.101:8080/;
}
```

## 4. 缓存策略

除了匹配请求路径访问对应文件之外，还需要配置合理的缓存策略，提升资源二次加载性能。由于 Webpack 打包会给静态资源加上哈希值，因此可以合理配置缓存规则，提升用户体验：

- html 文件配置协商缓存（`no-cache`）
- 静态资源文件由于带有哈希，可以配置强缓存，提升资源二次加载速度（例如图片资源设置 10 天强缓存，其他资源设置 30 天强缓存）

:::tip

注意：html 文件不能配置强缓存。因为 html 文件中需要引入静态资源地址，当我们修改 JS、CSS 文件后，Webpack 会生成新的 hash，对应静态资源地址也发生变化，相当于 html 文件也发生变化。如果配置强缓存，会导致资源更新后，用户访问的仍是旧的资源；如果配置协商缓存，每次浏览器访问 html 页面都会跟服务器确认资源新鲜度，每次都加载最新的页面，从而确保加载到最新的静态资源。

:::

## 5. location 匹配优先级

再注意下 `location` 的匹配优先级规则：

- `=` 表示精确匹配。只有请求的url路径与后面的字符串完全相等时，才会命中。
- `^~` 表示如果该符号后面的字符是最佳匹配，采用该规则，不再进行后续的查找。
- `~` 表示该规则是使用正则定义的，区分大小写。
- `~*` 表示该规则是使用正则定义的，不区分大小写。

nginx 的匹配优先顺序按照上面的顺序进行优先匹配，而且 **只要某一个匹配命中直接退出，不再进行往下的匹配**。

剩下的普通匹配会按照 **最长匹配长度优先级来匹配**，就是谁匹配的越多就用谁。

:::tip

nginx 每条规则都要以分号结尾，可以运行 `nginx -tc nginx.conf` 查看配置规则是否生效

:::

## 5. 完整的 nginx 配置

```bash
server {
  listen 80;
  server_name www.example.com;

  # html 页面访问
  location /ruoyi/ {
    # 支持 /ruoyi 子路径访问
    alias /root/workspace/ruoyi-ui/dist;

    # history 模式重点就是这里
    try_files $uri $uri/ /index.html;

    # html 文件不可设置强缓存，设置协商缓存即可
    add_header Cache-Control 'no-cache, must-revalidate, proxy-revalidate, max-age=0';
  }

  # 接口请求代理
  location ^~ /prod-api/ {
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header REMOTE-HOST $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://192.168.31.101:8080/;
  }

  # 静态资源访问
  location ~* \.(?:png|jpg|jpeg|webp|gif|bmp|tiff|ico|svg)$ {
    # 图片资源设置 10 天强缓存
    add_header Cache-Control 'public, max-age=864000';
  }

  location ~* \.(?:css(\.map)?|js(\.map)?)$ {
    # 其他资源设置 30 天强缓存
    add_header Cache-Control 'public, max-age=2592000';
  }
}
```

## 6. 总结

单页应用历史模式路由，如果不是根路径，请求服务器都会响应 404，需要在服务器端配置 `try_files` 按顺序进行匹配，其中请求页面路由命中 `/index.html` 规则，请求静态资源命中 `$uri` 规则。

当页面部署在子路径下的时候，使用 `root` 会拼接 `root` + `location`，使用 `alias` 则是用 `alias` 替换 `location` 中的路径。

前端项目部署的时候，还需要配置接口请求代理。

给 html 文件配置协商缓存，由于静态资源文件会带哈希，因此可以给静态资源文件配置强缓存。

`location` 匹配的优先级规则注意下。

## 参考

[前端到底用nginx来做啥](https://juejin.cn/post/7064378702779891749)

[一份简单够用的 Nginx Location 配置讲解](https://juejin.cn/post/7048952689601806366)
