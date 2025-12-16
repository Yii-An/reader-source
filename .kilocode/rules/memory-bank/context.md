# Reader Source - 当前上下文

## 当前工作状态

**日期**: 2025-12-15
**阶段**: 功能完善阶段（批量测试）

## 项目状态概述

Reader Source 是一个功能完整的书源编辑器桌面应用，核心功能已实现：

- ✅ Electron + Vue 3 架构搭建
- ✅ 书源列表管理（CRUD）
- ✅ 可视化规则编辑器（表单 + Monaco）
- ✅ 双向格式转换（any-reader ↔ Universal ↔ Legado）
- ✅ 规则测试面板（搜索/章节/发现/正文）
- ✅ Puppeteer 网页解析（含 Cloudflare 处理）
- ✅ IndexedDB 本地持久化
- ✅ 日志面板
- ✅ 用户文档
- ✅ **批量测试功能**（新增）
- ✅ **自动化转换测试脚本**（新增）

## 代码库统计

- **主进程**: 3 文件（index.ts, logger.ts, proxy.ts）
- **渲染进程组件**: 约 28 个 Vue 组件（新增 BatchTest.vue）
- **转换器**: 4 个核心转换器 + 表达式处理模块
- **类型定义**: 5 个类型文件
- **文档**: 2 个规范文档（docs/）
- **测试脚本**: 2 个（scripts/）
- **测试规则**: 5 个样例规则（test_rules/）
- **总代码行数**: 约 6500+ 行

## 近期变更

### 2025-12-15 更新

1. **新增批量测试功能**：
   - [`BatchTest.vue`](src/renderer/src/views/BatchTest.vue) - 批量测试独立页面（492行）
     - 多书源并发搜索测试（并发限制 3）
     - 左侧书源列表（全选/单选）
     - 右侧详情面板（复用 ResultTabs）
     - 测试统计（成功/失败/总结果数）
     - 状态实时更新（pending/running/success/error）
   - [`useBatchTest.ts`](src/renderer/src/components/test-panel/composables/useBatchTest.ts) - 批量测试 Composable（220行）
     - `runBatchTest()` - 批量执行测试
     - `testSingleSource()` - 单书源测试
     - 支持 CSS 和 XPath 两种解析模式
   - 路由新增 `/batch-test`
   - Home.vue 工具栏新增"批量测试"按钮

2. **新增测试脚本目录 `scripts/`**：
   - [`test-conversion.ts`](scripts/test-conversion.ts) - 规则转换测试脚本（405行）
     - 自动扫描 test_rules 目录
     - 执行往返转换测试（原格式 → Universal → 原格式）
     - 保存中间文件到 tmp/ 目录
     - 深度比较算法检测差异
   - [`test-roundtrip.ts`](scripts/test-roundtrip.ts) - 旧版往返测试脚本
   - [`README.md`](scripts/README.md) - 脚本使用说明（282行）

3. **新增测试规则目录 `test_rules/`**：
   - `anyReader/` - 17k小说.json、腾讯漫画.json
   - `legado/` - 3A小说.json、UAA 文学.json
   - `universal/` - 漫小肆韓漫.json

### 2025-12-12 更新

1. **新增文档目录 `docs/`**：
   - [`rule-guide.md`](docs/rule-guide.md) - 通用规则使用指南（443行）
   - [`universal-rule-spec.md`](docs/universal-rule-spec.md) - 通用规则规范设计方案（335行）

2. **表达式模块完善**：
   - JSOUP Default 语法转换（`jsoup.ts`）
   - 表达式验证器（`validator.ts`）
   - 变量转换器（`variables.ts`）

## 待优化项

1. **批量测试增强**：
   - 支持更多测试类型（章节/正文）
   - 测试结果导出功能
   - 测试历史记录
2. **表达式转换**: JSOUP Default 语法转换边界情况测试
3. **错误处理**: 转换器异常情况的用户提示优化
4. **UI 优化**: 大量规则时的列表虚拟滚动
5. **国际化**: 界面多语言支持（可选）

## 下一步建议

- 完善批量测试的结果导出功能
- 添加更多真实书源作为测试用例
- 考虑添加规则模板功能
- 优化转换器的错误提示
