# Reader Source - 技术文档

## 技术栈

### 核心框架

| 技术       | 版本    | 用途                  |
| ---------- | ------- | --------------------- |
| Electron   | ^39.2.6 | 跨平台桌面应用框架    |
| Vue        | ^3.5.25 | 前端 UI 框架          |
| TypeScript | ^5.9.3  | 类型安全的 JavaScript |

### 构建工具

| 技术             | 版本     | 用途                         |
| ---------------- | -------- | ---------------------------- |
| electron-vite    | ^5.0.0   | Electron + Vite 集成构建工具 |
| Vite             | ^7.2.6   | 现代前端构建工具             |
| electron-builder | ^26.0.12 | Electron 应用打包工具        |

### UI 组件与编辑器

| 技术                  | 版本    | 用途                   |
| --------------------- | ------- | ---------------------- |
| Arco Design Vue       | ^2.57.0 | 字节跳动 UI 组件库     |
| Monaco Editor         | ^0.55.1 | VS Code 代码编辑器内核 |
| @monaco-editor/loader | ^1.7.0  | Monaco Editor 加载器   |

### 状态管理与路由

| 技术       | 版本   | 用途           |
| ---------- | ------ | -------------- |
| Pinia      | ^3.0.4 | Vue 3 状态管理 |
| Vue Router | ^4.6.3 | Vue 路由管理   |

### 网络与解析

| 技术      | 版本     | 用途                        |
| --------- | -------- | --------------------------- |
| Puppeteer | ^24.32.1 | 无头浏览器，绕过 Cloudflare |
| Cheerio   | ^1.1.2   | 服务端 HTML 解析            |
| Axios     | ^1.13.2  | HTTP 客户端（备用）         |

### 数据存储

| 技术       | 版本   | 用途                   |
| ---------- | ------ | ---------------------- |
| idb-keyval | ^6.2.2 | IndexedDB 键值存储封装 |

### 开发工具

| 技术     | 版本    | 用途                |
| -------- | ------- | ------------------- |
| ESLint   | ^9.39.1 | 代码质量检查        |
| Prettier | ^3.7.4  | 代码格式化          |
| vue-tsc  | ^3.1.6  | Vue TypeScript 检查 |

## 开发环境设置

### 系统要求

- Node.js 18+ (推荐 20.x)
- npm / pnpm / yarn

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 开发命令

```bash
# 启动开发服务器
npm run dev

# 代码检查
npm run lint

# TypeScript 类型检查
npm run typecheck

# 格式化代码
npm run format

# 运行规则转换测试脚本
npx tsx scripts/test-conversion.ts
```

### 构建命令

```bash
# 完整构建
npm run build

# 仅打包（不检查类型）
npm run build:unpack

# 平台特定构建
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

## 项目配置

### TypeScript 配置

项目使用三个 tsconfig 文件：

- `tsconfig.json` - 主配置（引用其他配置）
- `tsconfig.node.json` - Node.js/主进程配置
- `tsconfig.web.json` - 渲染进程/Vue 配置

### Electron Vite 配置

`electron.vite.config.ts` 配置：

```typescript
export default defineConfig({
  main: {}, // 主进程配置
  preload: {}, // 预加载脚本配置
  renderer: {
    // 渲染进程配置
    resolve: {
      alias: { '@renderer': resolve('src/renderer/src') }
    },
    plugins: [vue(), vueDevTools()]
  }
})
```

### 路径别名

- `@renderer` → `src/renderer/src`

## 技术约束

### Electron 主进程限制

- 不能直接访问 DOM
- 必须通过 IPC 与渲染进程通信
- Puppeteer 必须在主进程运行

### 渲染进程安全

- `contextIsolation: true` - 上下文隔离
- `sandbox: false` - 需要 Node API 访问
- `webSecurity: false` - 允许加载外部图片

### Puppeteer 限制

- 必须等待 Cloudflare 验证完成
- 浏览器实例共享以节省资源
- 页面关闭时自动清理

## 依赖说明

### 主要依赖

#### @electron-toolkit/preload

提供预加载脚本工具，简化 IPC 暴露。

#### @electron-toolkit/utils

提供 Electron 工具函数（如 `is.dev` 环境检测）。

#### cheerio

服务端 jQuery 风格的 HTML 解析器，用于 `proxy:parse` 处理。

#### puppeteer

Google 维护的无头浏览器控制库，用于：

- 绕过 Cloudflare 等反爬机制
- 执行页面内 JavaScript
- 真实浏览器环境解析

#### idb-keyval

简洁的 IndexedDB 封装，提供：

- `get(key)` - 获取值
- `set(key, value)` - 设置值
- `del(key)` - 删除键
- `keys()` - 获取所有键

## IPC 通信设计

### API 暴露（preload/index.ts）

```typescript
const api = {
  proxy: (url, userAgent) => ipcRenderer.invoke('proxy:fetch', ...)
  parse: (html, options) => ipcRenderer.invoke('proxy:parse', ...)
  executeJs: (url, jsCode, userAgent) => ipcRenderer.invoke('proxy:executeJs', ...)
  parseInPage: (options) => ipcRenderer.invoke('proxy:parseInPage', ...)
  proxyImage: (url, referer) => ipcRenderer.invoke('proxy:image', ...)
}
```

### 渲染进程调用

```typescript
// 类型声明 (preload/index.d.ts)
declare global {
  interface Window {
    api: {
      proxy: (url: string, userAgent?: string) => Promise<ProxyResponse>
      parse: (html: string, options: ParseOptions) => Promise<ParseResponse>
      // ...
    }
  }
}

// 使用
const result = await window.api.proxy('https://example.com')
```

## 性能优化

### 浏览器实例复用

```typescript
let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) {
    return browser
  }
  browser = await puppeteer.launch({...})
  return browser
}
```

### 内存缓存策略

```typescript
// sourceStore.ts
const sources = ref<UniversalRule[]>([])

// 优先从内存读取，未命中回退到 IndexedDB
async function getSource(id: string): Promise<UniversalRule | null> {
  const cached = sources.value.find((s) => s.id === id)
  if (cached) return cached
  return (await get<UniversalRule>(`rule_${id}`)) || null
}
```

### 布局状态持久化

```typescript
// Home.vue - localStorage 存储布局配置
const LAYOUT_STORAGE_KEY = 'reader-source-layout'

function loadLayout(): void {
  const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
  // 恢复面板尺寸
}

function saveLayout(): void {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({...}))
}
```

## 调试技巧

### Puppeteer 调试模式

```typescript
// proxy.ts
const DEBUG_MODE = false // 设为 true 显示浏览器窗口

browser = await puppeteer.launch({
  headless: !DEBUG_MODE
  // ...
})
```

### 日志记录

```typescript
// 主进程日志输出到文件
import { redirectConsoleToLogger, getLogFilePath } from './logger'
redirectConsoleToLogger()
console.log('Log file:', getLogFilePath())
```

### 渲染进程日志

```typescript
// logStore.ts
const logStore = useLogStore()
logStore.info('信息日志')
logStore.debug('调试日志')
logStore.warn('警告日志')
logStore.error('错误日志')
```
