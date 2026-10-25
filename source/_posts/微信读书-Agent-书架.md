---
title: 微信读书开放 weread-skills，AI Agent 接管你的书架
date: 2026-05-18T12:30:00.000Z
categories:
  - AI 技术
tags:
  - AI Agent
  - 开源
  - 微信读书
---

微信读书近期开放了 `weread-skills` 接口，这意味着 AI Agent 可以直接与你的书架交互——搜索书籍、同步笔记、展示阅读数据。

## OpenWeRead

基于该接口，社区开源了 [**OpenWeRead**](https://github.com/Ceelog/OpenWeRead)，提供：

  * 🔍 **搜索书籍** — 通过 Agent 直接检索微信读书书库
  * 📝 **同步笔记** — 将阅读笔记、划线导出到外部
  * 📚 **展示书架** — 可视化你的阅读列表
  * 🛠️ **TypeScript SDK + CLI** — 方便二次集成

## 关注方向

这个接口非常适合做成”可观察的个人知识库 Agent”：

  1. **阅读日志化** — 每次阅读、标注、同步都留下日志
  2. **按主题导出** — 把笔记按项目/主题整理成稳定上下文
  3. **只读权限边界** — 外部 Agent 只能读不能改，安全可控

## 相关工具

[**readNeo**](https://readneo.vercel.app/) 是一个可视化工具，连接微信读书后可以展示书架、阅读统计、笔记划线，并一键导出到 Notion 和 flomo。

* * *

**参考链接：**

  * [OpenWeRead GitHub](https://github.com/Ceelog/OpenWeRead)
  * [V2EX 讨论帖](https://www.v2ex.com/t/1213221)
