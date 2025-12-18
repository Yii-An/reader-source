# 规则规范设计方案

Scripting Reader 插件的书源规则规范定义。

> **提示**：本文档为字段规范参考，若需入门教程请先阅读 [规则使用指南](./rule-guide.md)。

---

## 一、规则类型定义

完整类型定义位于 [universal.ts](../src/renderer/src/types/universal.ts)。

### 1.1 内容类型枚举

```typescript
export enum UniversalContentType {
  NOVEL = 'novel', // 小说/文字
  MANGA = 'manga' // 漫画/图片
}
```

### 1.2 主规则接口

```typescript
export interface UniversalRule {
  // ===== 基本信息 =====
  id: string // 唯一标识 (UUID)
  name: string // 规则名称
  host: string // 网站域名 (如 https://example.com)
  icon?: string // 图标 URL
  author?: string // 规则作者
  group?: string // 分组名称
  sort?: number // 排序权重 (越高越靠前)
  enabled?: boolean // 是否启用 (默认 true)
  comment?: string // 规则备注说明

  // ===== 内容类型 =====
  contentType: UniversalContentType // 内容类型

  // ===== 请求设置 =====
  userAgent?: string // 自定义 User-Agent

  // ===== 规则配置 =====
  search?: UniversalSearchRule // 搜索规则
  chapter?: UniversalChapterRule // 章节规则
  discover?: UniversalDiscoverRule // 发现页规则
  content?: UniversalContentRule // 正文规则

  // ===== 元数据 =====
  _meta?: UniversalRuleMeta // 规则元数据
}
```

---

## 二、规则模块定义

### 2.1 搜索规则 (UniversalSearchRule)

| 字段            | 类型    | 必填 | 说明                             |
| --------------- | ------- | :--: | -------------------------------- |
| `enabled`       | boolean |  ✓   | 是否启用搜索                     |
| `url`           | string  |  ✓   | 搜索 URL 模板                    |
| `list`          | string  |  ✓   | 结果列表选择器                   |
| `name`          | string  |  ✓   | 书名选择器                       |
| `result`        | string  |  ✓   | 结果 URL 选择器 (传递给下一阶段) |
| `cover`         | string  |      | 封面图选择器                     |
| `author`        | string  |      | 作者选择器                       |
| `description`   | string  |      | 描述/简介选择器                  |
| `latestChapter` | string  |      | 最新章节选择器                   |
| `wordCount`     | string  |      | 字数选择器                       |
| `tags`          | string  |      | 标签/分类选择器                  |

**URL 变量**：`$keyword` / `{{keyword}}`、`$page` / `{{page}}`

---

### 2.2 章节规则 (UniversalChapterRule)

| 字段      | 类型   | 必填 | 说明                          |
| --------- | ------ | :--: | ----------------------------- |
| `list`    | string |  ✓   | 章节列表选择器                |
| `name`    | string |  ✓   | 章节名选择器                  |
| `result`  | string |  ✓   | 章节 URL 选择器 (正文页地址)  |
| `url`     | string |      | 章节列表 URL (可从上一步获取) |
| `cover`   | string |      | 封面选择器 (用于更新封面)     |
| `time`    | string |      | 更新时间选择器                |
| `nextUrl` | string |      | 下一页 URL (分页章节列表)     |
| `isVip`   | string |      | VIP 章节标识选择器            |
| `isPay`   | string |      | 付费章节标识选择器            |

**URL 变量**：`$result` / `{{result}}`、`$page` / `{{page}}`

---

### 2.3 发现页规则 (UniversalDiscoverRule)

| 字段            | 类型    | 必填 | 说明                  |
| --------------- | ------- | :--: | --------------------- |
| `enabled`       | boolean |  ✓   | 是否启用发现页        |
| `url`           | string  |  ✓   | 发现页 URL 或分类配置 |
| `list`          | string  |  ✓   | 结果列表选择器        |
| `name`          | string  |  ✓   | 书名选择器            |
| `result`        | string  |  ✓   | 结果 URL 选择器       |
| `cover`         | string  |      | 封面图选择器          |
| `author`        | string  |      | 作者选择器            |
| `description`   | string  |      | 描述选择器            |
| `tags`          | string  |      | 标签选择器            |
| `latestChapter` | string  |      | 最新章节选择器        |
| `wordCount`     | string  |      | 字数选择器            |
| `nextUrl`       | string  |      | 下一页 URL 选择器     |

**分类配置格式**：

| 格式                  | 说明                                     |
| --------------------- | ---------------------------------------- |
| `分类名::URL`         | 单分类                                   |
| `分组名::分类名::URL` | 分组分类                                 |
| `@js:...`             | 动态生成，返回字符串数组或按行拆分字符串 |

**URL 变量**：`$page` / `{{page}}`

---

### 2.4 正文规则 (UniversalContentRule)

| 字段      | 类型   | 必填 | 说明                  |
| --------- | ------ | :--: | --------------------- |
| `items`   | string |  ✓   | 内容选择器            |
| `url`     | string |      | 正文页 URL (可选)     |
| `nextUrl` | string |      | 下一页 URL (分页正文) |

**URL 变量**：`$result` / `{{result}}`、`$page` / `{{page}}`

---

### 2.5 规则元数据 (UniversalRuleMeta)

| 字段           | 类型   | 必填 | 说明                           |
| -------------- | ------ | :--: | ------------------------------ |
| `sourceFormat` | string |  ✓   | 规则来源格式，固定 `universal` |
| `version`      | string |      | 规则版本号                     |
| `createdAt`    | number |      | 创建时间戳 (毫秒)              |
| `updatedAt`    | number |      | 更新时间戳 (毫秒)              |

---

## 三、选择器语法规范

解析逻辑由 [proxy.ts](../src/main/proxy.ts) 实现。

### 3.1 支持的选择器类型

| 类型     | 前缀/识别              | 说明                      |
| -------- | ---------------------- | ------------------------- |
| CSS      | 默认 / `@css:`         | 标准 CSS 选择器           |
| XPath    | `//` 或 `/` 开头       | XPath 表达式 (自动转 CSS) |
| JSONPath | `$.` / `$[` / `@json:` | JSON 路径表达式           |
| JS       | `@js:`                 | JavaScript 代码           |

### 3.2 CSS 选择器属性提取

```
选择器@属性
```

| 属性         | 说明             |
| ------------ | ---------------- |
| `@text`      | 文本内容 (默认)  |
| `@html`      | innerHTML        |
| `@outerHtml` | outerHTML        |
| `@href`      | href 属性        |
| `@src`       | src 属性         |
| `@data-xxx`  | 自定义 data 属性 |

**简写形式**：`text`、`href`、`src` 可直接作为规则使用，省略选择器。

### 3.3 正则替换后缀

```
规则##正则模式##替换内容
```

示例：`.title@text##\s+##` (删除空白)

### 3.4 相对 URL 补全

提取 `href` 或 `src` 时：

- 相对路径自动拼接规则的 `host`
- `//` 开头的协议相对 URL 自动补全协议

---

## 四、变量占位符

| 阶段 | 变量                                             |
| ---- | ------------------------------------------------ |
| 搜索 | `$keyword` / `{{keyword}}`、`$page` / `{{page}}` |
| 发现 | `$page` / `{{page}}`                             |
| 章节 | `$result` / `{{result}}`、`$page` / `{{page}}`   |
| 正文 | `$result` / `{{result}}`、`$page` / `{{page}}`   |

---

## 五、实现文件索引

| 模块               | 文件路径                                                             |
| ------------------ | -------------------------------------------------------------------- |
| 规则类型定义       | `src/renderer/src/types/universal.ts`                                |
| 解析逻辑 (主进程)  | `src/main/proxy.ts`                                                  |
| 测试辅助逻辑       | `src/renderer/src/components/test-panel/composables/useTestLogic.ts` |
| 规则 Schema (TS)   | `src/renderer/src/schemas/universalRuleSchema.ts`                    |
| 规则 Schema (JSON) | `docs/universal-rule-schema.json`                                    |

---

## 六、工具函数

### 6.1 工厂函数

```typescript
// 创建默认规则
createDefaultUniversalRule(): UniversalRule
```

创建一个带有随机 UUID、默认名称、启用的搜索模块和元数据的新规则。

### 6.2 常量映射

```typescript
// 内容类型中文标签
UniversalContentTypeLabels: Record<UniversalContentType, string>
```

| 类型    | 标签 |
| ------- | ---- |
| `novel` | 小说 |
| `manga` | 漫画 |
