# 规则规范设计方案

Scripting Reader 插件的书源规则规范定义。

## 一、规则类型定义

完整类型定义位于 [src/renderer/src/types/universal.ts](file:///Users/leslie/Documents/Code/Project/reader-source/src/renderer/src/types/universal.ts)。

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
  id: string // 唯一标识
  name: string // 规则名称
  host: string // 域名
  icon?: string // 图标 URL
  author?: string // 作者
  group?: string // 分组
  sort?: number // 排序权重
  enabled?: boolean // 是否启用
  comment?: string // 规则备注
  jsLib?: string // JS 函数库

  // ===== 内容类型 =====
  contentType: UniversalContentType

  // ===== 请求设置 =====
  userAgent?: string // User-Agent
  headers?: Record<string, string> // 请求头
  loadJs?: string // 全局 JS 脚本

  // ===== 规则配置 =====
  search?: UniversalSearchRule
  detail?: UniversalDetailRule
  chapter?: UniversalChapterRule
  discover?: UniversalDiscoverRule
  content?: UniversalContentRule

  // ===== 元数据 =====
  _meta?: UniversalRuleMeta
}
```

---

## 二、规则模块定义

### 2.1 搜索规则 (UniversalSearchRule)

| 字段            | 类型    | 必填 | 说明            |
| --------------- | ------- | :--: | --------------- |
| `enabled`       | boolean |  ✓   | 是否启用        |
| `url`           | string  |  ✓   | 搜索 URL 模板   |
| `list`          | string  |  ✓   | 列表选择器      |
| `name`          | string  |  ✓   | 名称选择器      |
| `result`        | string  |  ✓   | 结果 URL 选择器 |
| `cover`         | string  |      | 封面选择器      |
| `author`        | string  |      | 作者选择器      |
| `description`   | string  |      | 描述选择器      |
| `latestChapter` | string  |      | 最新章节选择器  |
| `wordCount`     | string  |      | 字数选择器      |
| `tags`          | string  |      | 标签选择器      |

### 2.2 详情页规则 (UniversalDetailRule)

| 字段            | 类型    | 说明             |
| --------------- | ------- | ---------------- |
| `enabled`       | boolean | 是否启用         |
| `url`           | string  | 详情页 URL       |
| `init`          | string  | 预处理规则       |
| `name`          | string  | 书名选择器       |
| `author`        | string  | 作者选择器       |
| `cover`         | string  | 封面选择器       |
| `description`   | string  | 简介选择器       |
| `latestChapter` | string  | 最新章节选择器   |
| `wordCount`     | string  | 字数选择器       |
| `tags`          | string  | 分类选择器       |
| `tocUrl`        | string  | 目录 URL         |
| `canRename`     | boolean | 允许修改书名作者 |

### 2.3 章节规则 (UniversalChapterRule)

| 字段         | 类型   | 必填 | 说明            |
| ------------ | ------ | :--: | --------------- |
| `list`       | string |  ✓   | 列表选择器      |
| `name`       | string |  ✓   | 章节名选择器    |
| `result`     | string |  ✓   | 章节 URL 选择器 |
| `url`        | string |      | 章节列表 URL    |
| `cover`      | string |      | 封面选择器      |
| `time`       | string |      | 时间选择器      |
| `nextUrl`    | string |      | 下一页 URL      |
| `isVip`      | string |      | VIP 标识        |
| `isPay`      | string |      | 付费标识        |
| `info`       | string |      | 章节信息        |
| `multiRoads` | object |      | 多线路配置      |

### 2.4 发现页规则 (UniversalDiscoverRule)

| 字段            | 类型    | 必填 | 说明            |
| --------------- | ------- | :--: | --------------- |
| `enabled`       | boolean |  ✓   | 是否启用        |
| `url`           | string  |  ✓   | 发现页 URL      |
| `list`          | string  |  ✓   | 列表选择器      |
| `name`          | string  |  ✓   | 名称选择器      |
| `result`        | string  |  ✓   | 结果 URL 选择器 |
| `cover`         | string  |      | 封面选择器      |
| `author`        | string  |      | 作者选择器      |
| `description`   | string  |      | 描述选择器      |
| `tags`          | string  |      | 标签选择器      |
| `latestChapter` | string  |      | 最新章节选择器  |
| `wordCount`     | string  |      | 字数选择器      |
| `nextUrl`       | string  |      | 下一页 URL      |

### 2.5 正文规则 (UniversalContentRule)

| 字段           | 类型    | 必填 | 说明              |
| -------------- | ------- | :--: | ----------------- |
| `items`        | string  |  ✓   | 内容选择器        |
| `url`          | string  |      | 正文页 URL        |
| `nextUrl`      | string  |      | 下一页 URL        |
| `decoder`      | string  |      | 解密器            |
| `imageHeaders` | string  |      | 图片请求头        |
| `webView`      | boolean |      | 使用 WebView 加载 |
| `payAction`    | string  |      | 购买操作          |
| `sourceRegex`  | string  |      | 资源正则          |
| `replaceRules` | array   |      | 正文净化替换规则  |

---

## 三、表达式语法规范

完整类型定义位于 [expression.ts](file:///Users/leslie/Documents/Code/Project/reader-source/src/renderer/src/types/expression.ts)。

### 3.1 表达式类型

```typescript
export type ExpressionType = 'css' | 'xpath' | 'json' | 'js' | 'regex' | 'literal' | 'logical'
```

| 类型       | 通用前缀    | 说明             |
| ---------- | ----------- | ---------------- |
| CSS        | `@css:`     | 标准 CSS 选择器  |
| XPath      | `@xpath:`   | XPath 表达式     |
| JSONPath   | `@json:`    | JSON 路径表达式  |
| JavaScript | `@js:`      | JavaScript 代码  |
| 正则       | `@regex:`   | 正则表达式       |
| 字面量     | 无前缀      | 直接使用的字符串 |
| 逻辑表达式 | `\|\|`/`&&` | 逻辑或/与组合    |

> **正则替换**: 使用 `##pattern##replacement` 语法。

### 3.2 变量映射

| 变量类型   | 通用语法        |
| ---------- | --------------- |
| 搜索关键词 | `{{keyword}}`   |
| 分页变量   | `{{page}}`      |
| 域名变量   | `{{host}}`      |
| 结果变量   | `{{result}}`    |
| 时间戳     | `{{timestamp}}` |

---

## 四、实现文件索引

### 4.1 类型定义

| 模块       | 文件路径                               |
| ---------- | -------------------------------------- |
| 规则类型   | `src/renderer/src/types/universal.ts`  |
| 表达式类型 | `src/renderer/src/types/expression.ts` |
| 类型守卫   | `src/renderer/src/types/guards.ts`     |

### 4.2 JSON Schema

| 模块        | 文件路径                                          |
| ----------- | ------------------------------------------------- |
| 规则 Schema | `src/renderer/src/schemas/universalRuleSchema.ts` |

---

## 五、工具函数

### 5.1 工厂函数

```typescript
// 创建默认规则
createDefaultUniversalRule(): UniversalRule
```

### 5.2 常量映射

```typescript
// 内容类型标签映射
UniversalContentTypeLabels: Record<UniversalContentType, string>
```

| 类型    | 标签 |
| ------- | ---- |
| `novel` | 小说 |
| `manga` | 漫画 |
