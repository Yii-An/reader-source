# 通用规则规范设计方案

设计一套跨平台的通用规则规范，支持 any-reader 与 Legado 规则的双向转换，包含规则字段映射和表达式语法转换。

## 设计决策

> [!NOTE]
> 以下关键设计决策已确认：
>
> 1. ✅ **详情页流程**：通用规则支持详情页流程（兼容 Legado 的详情页步骤）
> 2. ✅ **特殊字段**：保留所有特殊字段，使用 `_fieldSources` 标记字段来源平台
> 3. ✅ **表达式语法**：采用 any-reader 风格（统一小写前缀 `@css:`、`@xpath:`、`@json:`、`@js:`）
> 4. ✅ **选择器类型**：仅保留 CSS、XPath、JSONPath、JavaScript、正则（移除 JSOUP Default，因 CSS/XPath 已可满足需求）
> 5. ✅ **转换器实现**：双向转换器已完全实现，见 [conversion-logic.md](./conversion-logic.md)

---

## 一、通用规则类型定义

完整类型定义位于 [src/renderer/src/types/universal.ts](file:///Users/leslie/Documents/Code/Project/reader-source/src/renderer/src/types/universal.ts)。

### 1.1 内容类型枚举

```typescript
export enum UniversalContentType {
  NOVEL = 'novel', // 小说/文字
  MANGA = 'manga', // 漫画/图片
  VIDEO = 'video', // 视频
  AUDIO = 'audio', // 音频/有声
  RSS = 'rss', // RSS 订阅
  NOVELMORE = 'novelmore' // 小说（增强功能）
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

  // ===== 平台特有字段 =====
  anyReader?: AnyReaderBaseFields
  legado?: LegadoBaseFields

  // ===== 元数据 =====
  _fieldSources?: Record<string, RuleSourcePlatform>
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
| `anyReader`     | object  |      | any-reader 特有 |

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
| `anyReader`  | object |      | any-reader 特有 |

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
| `anyReader`     | object  |      | any-reader 特有 |

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
| `legado`       | object  |      | Legado 特有       |

---

## 三、表达式语法规范

完整类型定义位于 [expression.ts](file:///Users/leslie/Documents/Code/Project/reader-source/src/renderer/src/types/expression.ts)。

### 3.1 表达式类型

```typescript
export type ExpressionType = 'css' | 'xpath' | 'json' | 'js' | 'regex' | 'literal' | 'logical'
```

| 类型       | 通用前缀    | any-reader | Legado                |
| ---------- | ----------- | ---------- | --------------------- |
| CSS        | `@css:`     | `@css:`    | `@css:`               |
| XPath      | `@xpath:`   | `@xpath:`  | `@XPath:` 或 `//`     |
| JSONPath   | `@json:`    | `@json:`   | `@json:` 或 `$.`      |
| JavaScript | `@js:`      | `@js:`     | `<js></js>` 或 `@js:` |
| 正则       | `@regex:`   | `@filter:` | `:pattern`            |
| 字面量     | 无前缀      | 无前缀     | 无前缀                |
| 逻辑表达式 | `\|\|`/`&&` | 相同       | 相同                  |

> **正则替换**: 使用 `##pattern##replacement` 语法，两平台通用。

### 3.2 变量映射

| 变量类型   | 通用语法           | any-reader | Legado                           |
| ---------- | ------------------ | ---------- | -------------------------------- |
| 搜索关键词 | `{{keyword}}`      | `$keyword` | `{{key}}`                        |
| 分页变量   | `{{page}}`         | `$page`    | `{{page}}`                       |
| 域名变量   | `{{host}}`         | `$host`    | `{{baseUrl}}`                    |
| 当前页 URL | `{{currentUrl}}`   | -          | `{{url}}`                        |
| 结果变量   | `{{result}}`       | `result`   | `{{result}}`                     |
| 结果 URL   | `{{result.url}}`   | -          | `{{result.bookUrl}}`             |
| 结果封面   | `{{result.cover}}` | -          | `{{result.coverUrl}}`            |
| 时间戳     | `{{timestamp}}`    | -          | `{{System.currentTimeMillis()}}` |
| Cookie     | `{{cookie}}`       | -          | `{{cookie}}`                     |

---

## 四、平台特有字段

### 4.1 any-reader 基本字段 (AnyReaderBaseFields)

```typescript
interface AnyReaderBaseFields {
  useCryptoJS?: boolean // 使用 CryptoJS 库
  cookies?: string // Cookie 存储
  postScript?: string // 脚本后处理
  viewStyle?: number // 视图样式
}
```

### 4.2 Legado 基本字段 (LegadoBaseFields)

```typescript
interface LegadoBaseFields {
  bookUrlPattern?: string // 书籍 URL 正则
  enabledCookieJar?: boolean // 启用 Cookie 罐
  respondTime?: number // 响应时间
  weight?: number // 权重
  customOrder?: number // 自定义排序
  lastUpdateTime?: number // 最后更新时间
  loginUrl?: string // 登录 URL
  loginCheckUrl?: string // 登录检测 URL
  loginUi?: string // 登录 UI 配置
  loginCheckJs?: string // 登录检测 JS
}
```

---

## 五、字段映射对照表

### 5.1 基本信息

| 通用字段    | any-reader  | Legado                           |
| ----------- | ----------- | -------------------------------- |
| `id`        | `id`        | `bookSourceUrl`                  |
| `name`      | `name`      | `bookSourceName`                 |
| `host`      | `host`      | 从 `bookSourceUrl` 提取          |
| `icon`      | `icon`      | `bookSourceUrl` + `/favicon.ico` |
| `author`    | `author`    | -                                |
| `group`     | `group`     | `bookSourceGroup`                |
| `sort`      | `sort`      | `customOrder`                    |
| `userAgent` | `userAgent` | `header.User-Agent`              |
| `headers`   | 通过 JSON   | `header`                         |
| `loadJs`    | `loadJs`    | -                                |

### 5.2 搜索规则

| 通用字段               | any-reader          | Legado                   |
| ---------------------- | ------------------- | ------------------------ |
| `search.enabled`       | `enableSearch`      | 有 `searchUrl` 即启用    |
| `search.url`           | `searchUrl`         | `searchUrl`              |
| `search.list`          | `searchList`        | `ruleSearch.bookList`    |
| `search.name`          | `searchName`        | `ruleSearch.name`        |
| `search.cover`         | `searchCover`       | `ruleSearch.coverUrl`    |
| `search.author`        | `searchAuthor`      | `ruleSearch.author`      |
| `search.description`   | `searchDescription` | `ruleSearch.intro`       |
| `search.latestChapter` | `searchChapter`     | `ruleSearch.lastChapter` |
| `search.wordCount`     | -                   | `ruleSearch.wordCount`   |
| `search.tags`          | `searchTags`        | `ruleSearch.kind`        |
| `search.result`        | `searchResult`      | `ruleSearch.bookUrl`     |

### 5.3 详情页规则 (Legado 特有)

> **注意**: 详情页规则是 Legado 独有的流程，any-reader 不使用此规则。

| 通用字段               | Legado                     |
| ---------------------- | -------------------------- |
| `detail.enabled`       | 有 `ruleBookInfo` 即启用   |
| `detail.init`          | `ruleBookInfo.init`        |
| `detail.name`          | `ruleBookInfo.name`        |
| `detail.author`        | `ruleBookInfo.author`      |
| `detail.cover`         | `ruleBookInfo.coverUrl`    |
| `detail.description`   | `ruleBookInfo.intro`       |
| `detail.latestChapter` | `ruleBookInfo.lastChapter` |
| `detail.wordCount`     | `ruleBookInfo.wordCount`   |
| `detail.tags`          | `ruleBookInfo.kind`        |
| `detail.tocUrl`        | `ruleBookInfo.tocUrl`      |
| `detail.canRename`     | `ruleBookInfo.canReName`   |

### 5.4 目录规则

| 通用字段          | any-reader       | Legado                |
| ----------------- | ---------------- | --------------------- |
| `chapter.url`     | `chapterUrl`     | -                     |
| `chapter.list`    | `chapterList`    | `ruleToc.chapterList` |
| `chapter.name`    | `chapterName`    | `ruleToc.chapterName` |
| `chapter.cover`   | `chapterCover`   | -                     |
| `chapter.time`    | `chapterTime`    | `ruleToc.updateTime`  |
| `chapter.result`  | `chapterResult`  | `ruleToc.chapterUrl`  |
| `chapter.nextUrl` | `chapterNextUrl` | `ruleToc.nextTocUrl`  |
| `chapter.isVip`   | -                | `ruleToc.isVip`       |
| `chapter.isPay`   | -                | `ruleToc.isPay`       |

### 5.5 发现页规则

| 通用字段                 | any-reader            | Legado                    |
| ------------------------ | --------------------- | ------------------------- |
| `discover.enabled`       | `enableDiscover`      | `enabledExplore`          |
| `discover.url`           | `discoverUrl`         | `exploreUrl`              |
| `discover.list`          | `discoverList`        | `ruleExplore.bookList`    |
| `discover.name`          | `discoverName`        | `ruleExplore.name`        |
| `discover.cover`         | `discoverCover`       | `ruleExplore.coverUrl`    |
| `discover.author`        | `discoverAuthor`      | `ruleExplore.author`      |
| `discover.description`   | `discoverDescription` | `ruleExplore.intro`       |
| `discover.latestChapter` | `discoverChapter`     | `ruleExplore.lastChapter` |
| `discover.tags`          | `discoverTags`        | `ruleExplore.kind`        |
| `discover.result`        | `discoverResult`      | `ruleExplore.bookUrl`     |
| `discover.nextUrl`       | `discoverNextUrl`     | -                         |

### 5.6 正文规则

| 通用字段              | any-reader       | Legado                       |
| --------------------- | ---------------- | ---------------------------- |
| `content.url`         | `contentUrl`     | -                            |
| `content.items`       | `contentItems`   | `ruleContent.content`        |
| `content.nextUrl`     | `contentNextUrl` | `ruleContent.nextContentUrl` |
| `content.decoder`     | `contentDecoder` | -                            |
| `content.sourceRegex` | -                | `ruleContent.sourceRegex`    |
| `content.payAction`   | -                | `ruleContent.payAction`      |

### 5.7 any-reader 特有字段

| 特有字段                      | 所属模块 | 说明           |
| ----------------------------- | -------- | -------------- |
| `anyReader.useCryptoJS`       | 基本设置 | 是否使用加密库 |
| `anyReader.cookies`           | 基本设置 | Cookie 存储    |
| `anyReader.postScript`        | 基本设置 | 脚本后处理     |
| `anyReader.viewStyle`         | 基本设置 | 视图样式       |
| `search.anyReader.items`      | 搜索     | 搜索结果项     |
| `chapter.anyReader.items`     | 章节     | 章节项         |
| `chapter.anyReader.lock`      | 章节     | 章节锁定规则   |
| `chapter.multiRoads.enabled`  | 章节     | 多线路开关     |
| `chapter.multiRoads.roads`    | 章节     | 线路列表规则   |
| `chapter.multiRoads.roadName` | 章节     | 线路名称规则   |
| `discover.anyReader.items`    | 发现     | 发现结果项     |

### 5.8 Legado 特有字段

| 特有字段                      | 所属模块 | 说明            |
| ----------------------------- | -------- | --------------- |
| `legado.bookUrlPattern`       | 基本设置 | 书籍 URL 正则   |
| `legado.enabledCookieJar`     | 基本设置 | Cookie 罐开关   |
| `legado.respondTime`          | 基本设置 | 响应时间        |
| `legado.weight`               | 基本设置 | 排序权重        |
| `legado.customOrder`          | 基本设置 | 自定义排序      |
| `legado.lastUpdateTime`       | 基本设置 | 最后更新时间    |
| `legado.loginUrl`             | 登录     | 登录地址        |
| `legado.loginUi`              | 登录     | 登录 UI 配置    |
| `legado.loginCheckJs`         | 登录     | 登录检测 JS     |
| `content.legado.webJs`        | 正文     | 正文 WebView JS |
| `content.legado.replaceRegex` | 正文     | 正文替换规则    |
| `content.legado.imageStyle`   | 正文     | 图片样式配置    |

---

## 六、内容类型映射

| 通用类型 | any-reader  | Legado              |
| -------- | ----------- | ------------------- |
| `novel`  | `1` (NOVEL) | `bookSourceType: 0` |
| `audio`  | `3` (AUDIO) | `bookSourceType: 1` |
| `manga`  | `0` (MANGA) | 不支持（降级为 0）  |
| `video`  | `2` (VIDEO) | 不支持（降级为 0）  |
| `rss`    | -           | 不支持              |

---

## 七、实现文件索引

### 7.1 类型定义

| 模块            | 文件路径                               |
| --------------- | -------------------------------------- |
| 通用规则类型    | `src/renderer/src/types/universal.ts`  |
| 表达式类型      | `src/renderer/src/types/expression.ts` |
| any-reader 类型 | `src/renderer/src/types/index.ts`      |
| Legado 类型     | `src/renderer/src/types/legado.ts`     |
| 类型守卫        | `src/renderer/src/types/guards.ts`     |

### 7.2 转换器模块

| 模块       | 文件路径                                    |
| ---------- | ------------------------------------------- |
| 转换器入口 | `src/renderer/src/converters/index.ts`      |
| 基础类型   | `src/renderer/src/converters/base.ts`       |
| any-reader | `src/renderer/src/converters/any-reader.ts` |
| Legado     | `src/renderer/src/converters/legado.ts`     |

### 7.3 表达式处理

| 模块       | 文件路径                                              |
| ---------- | ----------------------------------------------------- |
| 模块入口   | `src/renderer/src/converters/expression/index.ts`     |
| 表达式解析 | `src/renderer/src/converters/expression/parser.ts`    |
| JSOUP 转换 | `src/renderer/src/converters/expression/jsoup.ts`     |
| 变量转换   | `src/renderer/src/converters/expression/variables.ts` |
| 表达式验证 | `src/renderer/src/converters/expression/validator.ts` |
