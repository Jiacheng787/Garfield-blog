---
slug: 安装ubuntu-22.04-lts遇到的问题
title: 安装Ubuntu 22.04 LTS遇到的问题
date: 2022-05-01T22:07
authors: [garfield]
tags: []
---

<!--truncate-->

Ubuntu 22.04 LTS 已于近日发布（April 22, 2022），推特上看已经有大佬用上了，本人也迫不及待尝试了一下，安装遇到的问题汇总如下。

## 1. 如何制作启动盘

在 Ubuntu 系统上提供了一个工具 Startup Disk Creator，可以用于制作启动盘，但本人的系统是 MacOS，需要下载一个工具：

> https://www.balena.io/etcher/

下载之后，按提示操作即可制作启动盘。

## 2. 解决 grub-install 报错的问题

每次安装快完成的时候，总是会报一个错误：

> Executing 'grub-install /dev/sda' failed. This is a fatal error.

这时候系统可以正常进去，可以正常使用，但是由于引导文件写入失败，一旦重启就无法正常进入系统。

这种情况下需要手动设置磁盘分区。默认情况下有两个分区，一个是 EFI 系统分区（500M 左右），另一个是 EXT4 分区（直接分配剩余空间）。

> 注意必须要有一个 EFI 系统分区，否则系统无法正常挂载。另外建议设置 swap 交换区，大小与 RAM 相当

参考了一些网上的解决方案，发现都行不通。最后本人自己设置了 4 个分区，配置如下：

- swap 交换区，大小 4000MB
- EFI 系统分区，大小 20GB，挂载点为 /
- EXT4 分区，用于存储用户文件，分配所有剩余空间，挂载点为 /home
- boot 分区，大小为 500MB

最后安装成功，没有报错了。分析引导文件写入失败主要应该是下面两个原因之一：

- 默认的 EFI 系统分区太小了
- 没有设置 boot 分区

## 参考

[How to Install Ubuntu 22.04 LTS Desktop (Jammy Jellyfish)](https://phoenixnap.com/kb/ubuntu-22-04-lts)
