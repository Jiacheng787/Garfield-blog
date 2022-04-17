---
slug: git-几个小技巧
title: Git 几个小技巧
date: 2022-04-11T22:17
authors: [garfield]
tags: [GIT]
---

<!--truncate-->

## 1. Git merge 三种策略

- `git merge`：默认使用 fast-forward 方式，git 直接把 HEAD 指针指向合并分支的头，完成合并。属于“快进方式”，不过这种情况如果删除分支，则会丢失分支信息。因为在这个过程中没有创建 commit
- `git merge --no-ff`：强行关闭 fast-forward 方式，可以保存之前的分支历史。能够更好的查看 merge 历史，以及 branch 状态
- `git merge --squash`：用来把一些不必要 commit 进行压缩，比如说，你的 feature 在开发的时候写的 commit 很乱，那么我们合并的时候不希望把这些历史 commit 带过来，于是使用 `--squash` 进行合并，需要进行一次额外的 commit 来“总结”一下，完成最终的合并

## 2. Git 如何变基拉取代码

在本地 commit 之后，下一步一般会执行 `git pull` 合并远程分支代码。我们知道 `git pull` 相当于 `git fetch && git merge`，通过 `merge` 方式合并代码，缺点就是会导致时间线比较混乱，出现大量没用的 commit 记录，给 Code Review 带来不便。另一种方式是变基拉取：

```bash
$ git pull --rebase
```

在变基操作的时候，我们不去合并别人的代码，而是直接把我们原先的基础变掉，变成以别人修改过后的新代码为基础，把我们的修改在这个新的基础之上重新进行。变基的好处之一是可以使我们的时间线变得非常干净。

变基操作的时候，会创建一个临时的 rebasing branch，如有冲突，合并完冲突的文件，添加到暂存区后，执行:

```bash
$ git rebase --continue
```

此时会进入 commit message 编辑界面，输入 `:q` 就会提交 commit，后续只要推送远程仓库即可。

如果不想继续变基操作，执行：

```bash
$ git rebase --abort
```

:::tip

如果你开发到一半，需要合入远程仓库的代码，不管你是 `git pull` 还是 `git pull --rebase`，都需要先清空本地工作区。

建议避免使用 `git stash`，这样是不安全的，很容易造成代码丢失。

强烈建议本地制造一些临时无用的 commit 来保证代码不会丢失。

:::

## 3. Git 操作之 `git push -f`

在开发一个项目的时候，本人将自己的 `feature` 分支合并到公共 `test` 分支，并且在测试环境部署成功。

几天后再去看的时候，发现测试环境提交的代码都不见了，本人在 `test` 分支的提交记录也都没了，只有另外一个同事留下的提交记录。最后重新将 `feature` 分支合到 `test`，再次部署到测试环境。

这个事情虽然影响不是很大，毕竟只是部署测试环境的分支，没有影响到 `feature` 分支，但是后来一直在想，究竟什么操作可以覆盖别人的提交记录。想来想去，应该只有下面几种情况：

- `git reset`：回退版本，实际上就是向后移动 `HEAD` 指针，该操作不会产生 commit 记录
- `git revert`：撤销某次操作，用一次新的 commit 来回滚之前的 commit，`HEAD` 继续前进，该操作之前和之后的 commit 和 history 都会保留
- `git push -f`：将自己本地的代码强制推送到远程仓库。当使用 `git push` 推送报错时，除了耐心解决冲突再提交之外，还可以使用这个命令强制推送，但通常会造成严重后果，例如覆盖别人的提交记录

由于开发一般都在自己的 `feature` 分支上，只有在需要测试的时候才会合并 `test` 分支，因此使用 `git reset` 可能性不大。`git revert` 更不可能，不仅不会修改 history，同时还会创建一条新的 commit 记录。因此可能性最大的就是 `git push -f` 了。

一般我们推送代码之前都会习惯性执行 `git pull`，就算不执行 `git pull`，直接推送，只要有人在你之前推送过也会报错：

```bash
$ git push -u origin main

error: failed to push some refs to 'https://github.com/Jiacheng787/git-operate-demo.git'
hint: Updates were rejected because the remote contains work that you do
hint: not have locally. This is usually caused by another repository pushing
hint: to the same ref. You may want to first integrate the remote changes
hint: (e.g., 'git pull ...') before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
```

在这种情况下，常规做法是执行 `git pull` 更新本地提交记录，如有冲突则解决冲突，然后再次推送。另一种做法就是强制推送：

```bash
$ git push -f origin main
```

可以看到就算没有事先 `git pull` 也不会报错，但是这样会导致远程仓库的提交记录被覆盖，远程仓库的提交记录变成了你本地的记录，你上次同步代码之后别人的提交记录都丢失了。

:::tip

一个应用场景：使用 `create-next-app` 创建了一个 nextjs 项目，并且已经推送到 GitHub 上，结果发现该项目是用 JS 创建的，想改用 TypeScript 创建

先删除本地仓库，重新初始化一个仓库：

```bash
$ git init
```

本地提交：

```bash
$ git add .
$ git commit -m "Initial commit"
```

下一步强制推送到远程仓库即可：

```bash
$ git branch -m main
$ git remote add origin <REPO_TARGET>
$ git push -f origin main
```

:::

## 4. cherry-pick 命令

有时候一个项目被拉了多个分支单独维护，一个分支上的 commit 需要同步到其他分支，可以使用 cherry-pick 命令“复制”代码。

首先查看需要复制的分支对应 commit 的哈希：

```bash
$ git log --oneline feat-1
```

记下对应的 commit 的 hash 值，使用 cherry-pick 命令将这个 commit 对应的代码复制到当前分支：

```bash
$ git cherry-pick c843c37
```

cherry-pick 实际上就是将已经提交的 commit，复制出新的 commit 应用到分支里。当 cherry-pick 出现冲突，则会停下来，让用户决定如何继续操作。用户解决冲突后，需要自己 add 然后 commit。如果在代码冲突后，需要放弃或者退出流程：

```bash
$ git cherry-pick --abort
```

或者回到操作前的样子，就像什么都没发生过：

```bash
$ git cherry-pick --quit
```

## 参考

[Git不要只会pull和push，试试这5条提高效率的命令](https://juejin.cn/post/7071780876501123085)

[血泪教训之请不要再轻视Git —— 我在工作中是如何使用 Git 的](https://zhuanlan.zhihu.com/p/250493093)
