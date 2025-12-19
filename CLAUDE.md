# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reader Source is a desktop application for creating and editing book source rules for the iOS Scripting Reader platform. Built with Electron + Vue 3 + TypeScript, it supports two content types: novels (text) and manga (images).

## Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run lint             # Check code quality (ESLint)
npm run typecheck        # Full TypeScript check (both Node & Web)
npm run typecheck:node   # Node.js/main process type check only
npm run typecheck:web    # Renderer/Vue process type check only
npm run format           # Format code with Prettier

# Building
npm run build            # Full type check + build (all platforms)
npm run build:mac        # Build for macOS
npm run build:win        # Build for Windows
npm run build:linux      # Build for Linux
```

## Architecture

### Three-Layer Electron Architecture

1. **Main Process** (`src/main/`): Node.js environment
   - Window management, IPC handlers
   - Puppeteer/Cheerio parsing for web content
   - Cloudflare bypass with auto-retry logic

2. **Preload Script** (`src/preload/`): IPC bridge
   - Exposes `window.api` with methods: `proxy()`, `parse()`, `executeJs()`, `parseInPage()`, `proxyImage()`
   - Uses `contextIsolation: true` for security

3. **Renderer Process** (`src/renderer/src/`): Vue 3 UI
   - Pinia stores for state management
   - TDesign component library
   - Monaco Editor for JSON rule editing

### Key Directories

```
src/
├── main/                    # Electron main process
│   ├── index.ts            # Window creation, IPC setup
│   ├── logger.ts           # Logging system
│   └── proxy.ts            # Network proxy & parsing (Puppeteer/Cheerio)
├── preload/                 # IPC bridge (window.api)
└── renderer/src/
    ├── components/
    │   ├── source-editor/  # Rule editing forms
    │   └── test-panel/     # Rule testing module with composables
    ├── stores/             # Pinia state (sourceStore, logStore)
    ├── types/              # TypeScript definitions (universal.ts)
    └── views/              # Home.vue, BatchTest.vue
```

### State Management

- `sourceStore`: Book source CRUD, IndexedDB persistence (key format: `rule_{id}`)
- `logStore`: Application logs for display panel

## Code Conventions

### TypeScript Path Alias
- `@renderer/*` → `src/renderer/src/*`

### File Naming
- Vue components: PascalCase (`SourceList.vue`)
- TypeScript files: camelCase (`useTestLogic.ts`)
- Composables: `use*` prefix

### Formatting
- Single quotes, no semicolons, 100 char line width, no trailing commas

### Git Commits
- Format: `<type>(<scope>): <subject>` (subject must be in Chinese)
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

## Technical Details

### Puppeteer Configuration
- Shared browser instance for resource efficiency
- Auto-retry on Cloudflare detection (5s intervals, max 6 attempts)
- Set `DEBUG_MODE = true` in `src/main/proxy.ts` to show browser window

### Batch Testing
- Concurrency limited to 3 Puppeteer tasks to prevent resource exhaustion

### Security Settings
- `contextIsolation: true` - prevents renderer access to main process
- `sandbox: false` - allows Node.js API in preload
- `webSecurity: false` - allows loading external images

## Documentation

- `/docs/universal-rule-spec.md` - Complete rule field definitions
- `/docs/rule-guide.md` - Expression syntax and best practices
- `/docs/universal-rule-schema.json` - Monaco editor validation schema
