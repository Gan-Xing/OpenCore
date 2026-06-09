# OpenForge 代码生成器路线图

OpenForge 是 OpenCore 的代码生成器。

## 目标

OpenForge 后续用于生成：

- NestJS 模块骨架。
- DTO、Controller、Service 和测试骨架。
- OpenAPI 契约片段。
- Umi Max + Ant Design Pro V6 页面骨架。
- ProComponents 列表、表单、详情和操作区。
- 权限点、菜单和模块注册表元数据。
- SDK 类型和调用封装。

## 设计原则

- 生成器不替代架构判断。
- 生成物必须可读、可格式化、可覆盖。
- 输入应优先来自模块注册表、契约和明确 schema。
- 生成器必须支持 dry run、diff 和幂等执行。

## 学习方向

可以学习 RuoYi/Yudao 的代码生成器思路，包括权限粒度、菜单联动、精简版/完整版和模块地图联动。

OpenCore 不复制 RuoYi/Yudao 的 Java/Vue 代码，也不沿用其运行时实现。

## S0/S1 边界

当前阶段只创建 `tools/generator` 目录和路线文档，不实现生成器逻辑。
