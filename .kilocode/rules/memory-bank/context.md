# Reader Source - 当前上下文

## 当前工作状态

**日期**: 2025-12-19
**阶段**: 稳定维护

## 项目状态概述

Reader Source 是一个专为 Scripting Reader 插件设计的书源编辑器桌面应用，核心功能已完成：

- ✅ Electron + Vue 3 架构搭建
- ✅ 书源列表管理（CRUD）
- ✅ 可视化规则编辑器（表单 + Monaco）
- ✅ JSON Schema 智能提示与校验
- ✅ 规则测试面板（搜索/章节/发现/正文）
- ✅ Puppeteer 网页解析（含 Cloudflare 处理）
- ✅ IndexedDB 本地持久化
- ✅ 日志面板
- ✅ 批量测试功能
- ✅ 用户文档

## 代码库统计

- **主进程**: 3 文件（index.ts, logger.ts, proxy.ts - 共约 1500 行）
- **渲染进程组件**: 约 25 个 Vue 组件
- **类型定义**: 2 个类型文件（index.ts, universal.ts）
- **Schema**: 2 个（TS + JSON）
- **文档**: 3 个规范文档（docs/）
- **总代码行数**: 约 5000+ 行

## 近期变更

### 2025-12-19 Memory Bank 更新

1. **文档修正**：
   - 修正 UI 组件库名称（Arco Design Vue → TDesign Vue Next）
   - 移除不存在的 DetailRuleForm.vue 记录
   - 更新类型文件行数（universal.ts 136 行）

### 2025-12-17 架构简化

1. **移除格式转换器**：
   - 删除 `converters/` 目录
   - 不再支持 any-reader 和 Legado 格式转换
   - 项目专注于 Universal 格式（Scripting Reader 原生格式）

2. **移除测试脚本目录**：
   - 删除 `scripts/` 目录（test-conversion.ts, test-roundtrip.ts）
   - 删除 `test_rules/` 目录

3. **类型系统简化**：
   - [`universal.ts`](src/renderer/src/types/universal.ts) 精简为 136 行
   - 内容类型仅保留 `novel` 和 `manga`
   - 移除平台特有字段（anyReader, legado）
   - `_meta.sourceFormat` 固定为 `'universal'`

4. **新增 JSON Schema**：
   - [`universalRuleSchema.ts`](src/renderer/src/schemas/universalRuleSchema.ts) - Monaco 编辑器集成
   - [`universal-rule-schema.json`](docs/universal-rule-schema.json) - 标准 JSON Schema

5. **组件优化**：
   - `SearchResultList.vue` → [`BookResultList.vue`](src/renderer/src/components/test-panel/results/BookResultList.vue)
   - 移除 `DiscoverResultList.vue`（复用 BookResultList）

### 2025-12-15 更新

1. **批量测试功能**：
   - [`BatchTest.vue`](src/renderer/src/views/BatchTest.vue) - 批量测试页面
   - [`useBatchTest.ts`](src/renderer/src/components/test-panel/composables/useBatchTest.ts) - 批量测试逻辑

2. **文档完善**：
   - [`rule-guide.md`](docs/rule-guide.md) - 规则编写指南
   - [`universal-rule-spec.md`](docs/universal-rule-spec.md) - 规则规范

## 项目定位变更

项目从「多格式通用书源编辑器」简化为「Scripting Reader 专用书源编辑器」：

- **之前**: 支持 any-reader、Legado、Universal 三种格式的双向转换
- **现在**: 专注于 Universal 格式，服务 Scripting Reader 插件

## 待优化项

1. **批量测试增强**: 支持更多测试类型（章节/正文）
2. **测试结果导出**: 导出测试报告功能
3. **UI 优化**: 大量规则时的列表虚拟滚动
4. **规则模板**: 常用网站规则模板库

## 下一步建议

- 完善批量测试的结果导出功能
- 添加规则模板功能
- 考虑规则分享/导入功能优化
