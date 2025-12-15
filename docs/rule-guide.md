# 通用规则使用指南

本文档介绍如何编写通用规则来解析各类网站内容。通用规则兼容 [any-reader](https://aooiuu.github.io/any-reader/rule/) 和 [Legado](https://mgz0227.github.io/The-tutorial-of-Legado/Rule/source.html) 两种主流规则格式。

## 目录

- [规则结构概览](#规则结构概览)
- [基本信息](#基本信息)
- [规则表达式语法](#规则表达式语法)
- [搜索规则](#搜索规则)
- [发现页规则](#发现页规则)
- [章节规则](#章节规则)
- [正文规则](#正文规则)
- [详情页规则](#详情页规则)
- [规则示例](#规则示例)

---

## 规则结构概览

通用规则是一个 JSON 对象，包含以下主要模块：

```json
{
  "id": "唯一标识",
  "name": "规则名称",
  "host": "https://example.com",
  "contentType": "novel",
  "search": {
    /* 搜索规则 */
  },
  "discover": {
    /* 发现页规则 */
  },
  "chapter": {
    /* 章节规则 */
  },
  "content": {
    /* 正文规则 */
  },
  "detail": {
    /* 详情页规则 (可选) */
  }
}
```

### 内容类型 (contentType)

| 类型    | 说明      |
| ------- | --------- |
| `novel` | 小说/文字 |
| `manga` | 漫画/图片 |
| `video` | 视频      |
| `audio` | 音频/有声 |
| `rss`   | RSS 订阅  |

---

## 基本信息

| 字段          | 类型    | 必填 | 说明                               |
| ------------- | ------- | :--: | ---------------------------------- |
| `id`          | string  |  ✓   | 唯一标识 (UUID)                    |
| `name`        | string  |  ✓   | 规则名称                           |
| `host`        | string  |  ✓   | 网站域名，如 `https://example.com` |
| `contentType` | string  |  ✓   | 内容类型                           |
| `enabled`     | boolean |      | 是否启用 (默认 true)               |
| `icon`        | string  |      | 图标 URL                           |
| `author`      | string  |      | 规则作者                           |
| `group`       | string  |      | 分组名称                           |
| `comment`     | string  |      | 规则备注说明                       |
| `sort`        | number  |      | 排序权重 (越高越靠前)              |
| `userAgent`   | string  |      | 自定义 User-Agent                  |
| `headers`     | object  |      | 自定义请求头                       |
| `loadJs`      | string  |      | 全局 JS 脚本                       |

---

## 规则表达式语法

规则表达式用于从网页或 API 响应中提取数据，支持以下几种类型：

| 类型       | 前缀      | 说明             |
| ---------- | --------- | ---------------- |
| CSS        | `@css:`   | 标准 CSS 选择器  |
| XPath      | `@xpath:` | XPath 表达式     |
| JSONPath   | `@json:`  | JSON 路径表达式  |
| JavaScript | `@js:`    | JavaScript 代码  |
| 正则       | `@regex:` | 正则表达式匹配   |
| 字面量     | 无前缀    | 直接使用的字符串 |

### CSS 选择器

以 `@css:` 开头，使用标准 CSS 选择器语法。

```
@css:.book-list li
@css:.title@text
@css:img.cover@src
@css:.lazy@data-original
```

> **格式**: `@css:选择器@属性`
>
> - 常用属性：`text`、`html`、`href`、`src`、`data-original`
> - 省略属性时默认获取元素本身

### XPath

以 `@xpath:` 开头，使用 XPath 语法。

```
@xpath://div[@class="content"]/text()
@xpath://*[@id="chapter-list"]/li
```

### JSONPath

以 `@json:` 开头，用于解析 JSON 数据。

```
@json:$.data.list
@json:$.data.list[0].title
@json:$..name
```

### JavaScript

以 `@js:` 开头，可执行 JavaScript 代码。

```
@js:result.data.list
@js:result.match(/url:'([^']+)'/)[1]
@js:(async () => { return await fetch(result).then(e => e.text()); })()
```

**可用变量**:

| 变量         | 说明               |
| ------------ | ------------------ |
| `result`     | 当前阶段的响应结果 |
| `lastResult` | 上一阶段的结果     |
| `$host`      | 规则的 host 值     |

**内置工具**:

- `CryptoJS`: 加解密库
- `fetch`: 网络请求
- `cheerio`: HTML 解析

### 正则替换

使用 `##` 进行正则替换。

```
@css:.url@href##\\d+\\.html##
$.title##</?em>##
```

> **格式**: `规则##正则模式##替换内容`
>
> - 替换内容为空时可省略第二个 `##`

### 组合操作符

| 操作符 | 说明                           | 示例                  |
| ------ | ------------------------------ | --------------------- |
| `\|\|` | 或逻辑，第一个为空则使用第二个 | `$.a \|\| $.b`        |
| `&&`   | 与逻辑，结果合并               | `$.a && $.b`          |
| `{{}}` | 变量模板                       | `http://xxx/{{$.id}}` |

---

## 搜索规则

用于实现搜索功能，从搜索结果页提取书籍/内容列表。

### 字段说明

| 字段            | 类型    | 必填 | 说明            |
| --------------- | ------- | :--: | --------------- |
| `enabled`       | boolean |  ✓   | 是否启用搜索    |
| `url`           | string  |  ✓   | 搜索 URL 模板   |
| `list`          | string  |  ✓   | 列表选择器      |
| `name`          | string  |  ✓   | 名称选择器      |
| `result`        | string  |  ✓   | 结果 URL 选择器 |
| `cover`         | string  |      | 封面选择器      |
| `author`        | string  |      | 作者选择器      |
| `description`   | string  |      | 描述选择器      |
| `latestChapter` | string  |      | 最新章节选择器  |
| `tags`          | string  |      | 标签选择器      |

### URL 模板变量

| 变量                   | 说明             |
| ---------------------- | ---------------- |
| `$keyword` / `{{key}}` | 搜索关键词       |
| `$page` / `{{page}}`   | 页码 (从 1 开始) |
| `$host` / `{{host}}`   | 规则 host        |

### 示例

```json
{
  "search": {
    "enabled": true,
    "url": "https://example.com/search?q=$keyword&page=$page",
    "list": ".book-list li",
    "name": ".title@text",
    "author": ".author@text",
    "cover": "img@src",
    "result": "a@href"
  }
}
```

---

## 发现页规则

用于实现发现/分类浏览功能。

### 字段说明

| 字段            | 类型    | 必填 | 说明                  |
| --------------- | ------- | :--: | --------------------- |
| `enabled`       | boolean |  ✓   | 是否启用发现页        |
| `url`           | string  |  ✓   | 发现页 URL 或分类规则 |
| `list`          | string  |  ✓   | 列表选择器            |
| `name`          | string  |  ✓   | 名称选择器            |
| `result`        | string  |  ✓   | 结果 URL 选择器       |
| `cover`         | string  |      | 封面选择器            |
| `author`        | string  |      | 作者选择器            |
| `latestChapter` | string  |      | 最新章节选择器        |
| `wordCount`     | string  |      | 字数选择器            |
| `nextUrl`       | string  |      | 下一页 URL 选择器     |

### 分类 URL 格式

```
分类名1::url1
分类名2::url2
分组::分类名::url
```

也可使用 `@js:` 动态生成：

```javascript
@js:(() => {
  return [
    '玄幻::/xuanhuan_$page.html',
    '都市::/dushi_$page.html'
  ];
})();
```

### 示例

```json
{
  "discover": {
    "enabled": true,
    "url": "玄幻::/list/xuanhuan_$page.html\n都市::/list/dushi_$page.html",
    "list": ".book-item",
    "name": ".title@text",
    "cover": ".cover img@src",
    "author": ".author@text",
    "result": "a@href"
  }
}
```

---

## 章节规则

用于从详情页获取章节列表。

### 字段说明

| 字段      | 类型   | 必填 | 说明                          |
| --------- | ------ | :--: | ----------------------------- |
| `url`     | string |      | 章节列表 URL (可从上一步获取) |
| `list`    | string |  ✓   | 列表选择器                    |
| `name`    | string |  ✓   | 章节名选择器                  |
| `result`  | string |  ✓   | 章节 URL 选择器               |
| `cover`   | string |      | 封面选择器                    |
| `time`    | string |      | 更新时间选择器                |
| `nextUrl` | string |      | 下一页 URL 选择器             |
| `isVip`   | string |      | VIP 标识选择器                |

### 示例

```json
{
  "chapter": {
    "list": "#chapter-list li",
    "name": "a@text",
    "result": "a@href",
    "time": ".time@text"
  }
}
```

---

## 正文规则

用于提取文章/章节的正文内容。

### 字段说明

| 字段           | 类型   | 必填 | 说明                        |
| -------------- | ------ | :--: | --------------------------- |
| `url`          | string |      | 正文页 URL (可从上一步获取) |
| `items`        | string |  ✓   | 内容选择器                  |
| `nextUrl`      | string |      | 下一页 URL (分页正文)       |
| `decoder`      | string |      | 解密器脚本                  |
| `imageHeaders` | string |      | 图片请求头                  |

### 示例

```json
{
  "content": {
    "items": "#content@text"
  }
}
```

**漫画正文示例** (获取图片列表):

```json
{
  "content": {
    "items": "@js:result.match(/images = (\\[.*?\\])/)[1]@json:$"
  }
}
```

---

## 详情页规则

> **注意**: 详情页是可选流程。any-reader 可跳过此步骤，直接从搜索结果进入章节列表。

### 字段说明

| 字段          | 类型    | 必填 | 说明           |
| ------------- | ------- | :--: | -------------- |
| `enabled`     | boolean |      | 是否启用详情页 |
| `name`        | string  |      | 书名选择器     |
| `author`      | string  |      | 作者选择器     |
| `cover`       | string  |      | 封面选择器     |
| `description` | string  |      | 简介选择器     |
| `tocUrl`      | string  |      | 目录页 URL     |

---

## 规则示例

### 小说站规则

```json
{
  "id": "example-novel",
  "name": "示例小说站",
  "host": "https://www.example.com",
  "contentType": "novel",
  "search": {
    "enabled": true,
    "url": "https://www.example.com/search?keyword=$keyword&page=$page",
    "list": ".search-list li",
    "name": ".book-name@text",
    "author": ".book-author@text",
    "cover": ".book-cover img@src",
    "latestChapter": ".latest-chapter@text",
    "result": ".book-name a@href"
  },
  "chapter": {
    "list": ".chapter-list li",
    "name": "a@text",
    "result": "a@href"
  },
  "content": {
    "items": "#content@text"
  }
}
```

### 漫画站规则

```json
{
  "id": "example-manga",
  "name": "示例漫画站",
  "host": "https://manga.example.com",
  "contentType": "manga",
  "discover": {
    "enabled": true,
    "url": "@js:(() => {\n  var types = ['热门', '更新', '完结'];\n  return types.map(t => `${t}::/list/${t}/$page.html`);\n})();",
    "list": ".manga-list .item",
    "name": ".title@text",
    "cover": "img@data-src",
    "result": "a@href"
  },
  "chapter": {
    "list": ".chapter-list a",
    "name": "@text",
    "result": "@href"
  },
  "content": {
    "items": "@js:(async () => {\n  var data = JSON.parse(result.match(/DATA = '([^']+)/)[1]);\n  return data.images;\n})();"
  }
}
```

---

## 调试技巧

1. **使用浏览器开发者工具**
   - 在 Elements 面板测试 CSS 选择器
   - 在 Console 面板测试 JavaScript 表达式

2. **逐步验证**
   - 先确保 URL 能正确访问
   - 验证列表选择器能获取到元素
   - 再逐一验证各字段选择器

3. **处理动态内容**
   - 对于 JavaScript 渲染的页面，使用 `@js:` 规则
   - 必要时启用 WebView 模式

---

## 参考资料

- [any-reader 规则文档](https://aooiuu.github.io/any-reader/rule/)
- [Legado 书源规则说明](https://mgz0227.github.io/The-tutorial-of-Legado/Rule/source.html)
- [CSS 选择器参考](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Selectors)
- [XPath 教程](https://developer.mozilla.org/zh-CN/docs/Web/XPath)
- [JSONPath 文档](https://github.com/JSONPath-Plus/JSONPath)
