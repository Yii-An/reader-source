# Reader Source

iOS [Scripting](https://scripting.fun/) 阅读插件的书源编辑器。

## 项目概述

本项目为 [Scripting](https://scripting.fun/) iOS 自动化工具中的 Reader 阅读插件提供配套的桌面端书源编辑器。

### 支持的内容类型

- 📖 小说 (novel) - 文字内容
- 🖼️ 漫画 (manga) - 图片内容

## 功能特性

- **书源编辑** - Monaco 编辑器，支持 JSON Schema 智能提示与校验
- **规则测试** - 内置测试面板，支持搜索、发现、章节、正文各阶段调试
- **可视化预览** - 搜索结果、章节列表、正文内容实时预览
- **批量测试** - 多书源并发搜索测试

## 技术栈

- **框架**: Electron + Vue 3 + TypeScript
- **构建**: electron-vite + Vite
- **UI**: Arco Design Vue
- **编辑器**: Monaco Editor
- **解析**: Cheerio + Puppeteer

## 项目结构

```
reader-source/
├── src/                          # 编辑器源码
│   ├── main/                     # Electron 主进程
│   ├── preload/                  # 预加载脚本
│   └── renderer/                 # Vue 渲染进程
│       └── src/
│           ├── components/       # UI 组件
│           ├── types/            # 类型定义
│           └── views/            # 页面视图
├── tmp/Scripting/scripts/Reader/ # Scripting Reader 插件源码
│   ├── screens/                  # 界面 (TSX)
│   ├── services/                 # 服务层
│   ├── components/               # 组件
│   └── types.ts                  # 类型定义
├── docs/                         # 文档
│   ├── universal-rule-spec.md    # 规则规范
│   ├── rule-guide.md             # 规则编写指南
│   └── universal-rule-schema.json
└── test_rules/                   # 测试规则
```

## 开发指南

### 环境要求

- Node.js >= 18
- npm / pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务

```bash
npm run dev
```

### 构建应用

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

## 相关文档

- [规则规范](docs/universal-rule-spec.md) - 规则字段定义
- [规则编写指南](docs/rule-guide.md) - 规则表达式语法与示例
- [Scripting 文档](https://scripting.fun/doc_v2/zh/guide/doc_v2/Quick%20Start)

## 相关项目

- [Scripting](https://scripting.fun/) - iOS 自动化工具

## IDE 配置

推荐使用 [VSCode](https://code.visualstudio.com/) 配合以下插件:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
