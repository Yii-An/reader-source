/**
 * @file Electron 主进程入口
 * @description 负责应用窗口管理、IPC 通信注册和生命周期管理。
 *              主要职责包括：
 *              1. 创建和配置主窗口
 *              2. 注册代理服务的 IPC 处理器
 *              3. 管理应用生命周期（启动、退出）
 *              4. 配置日志系统
 */

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerProxyHandlers, closeBrowser } from './proxy'
import { redirectConsoleToLogger, getLogFilePath } from './logger'

// ==================== 日志系统初始化 ====================
// 将 console 输出重定向到日志文件，便于调试和问题排查
redirectConsoleToLogger()
console.log('========================================')
console.log('Application starting...')
console.log('Log file:', getLogFilePath())
console.log('========================================')

/**
 * 创建应用主窗口
 * @description 配置并创建 BrowserWindow 实例，包括：
 *              - 窗口尺寸：默认 1600x1000，最小 1200x800
 *              - 安全设置：禁用沙箱以支持 Node API，禁用 webSecurity 以加载外部图片
 *              - 预加载脚本：注入 IPC 通信 API
 *              - 外部链接处理：在系统浏览器中打开
 * @returns {void}
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    show: false, // 先隐藏，等待内容加载完成后再显示，避免白屏闪烁
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // 禁用沙箱以允许预加载脚本访问 Node API
      webSecurity: false // 禁用同源策略，允许加载跨域图片资源
    }
  })

  // 窗口准备就绪后显示，避免加载过程中的白屏
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 拦截新窗口打开请求，改为在系统默认浏览器中打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 根据环境加载不同的页面：开发环境使用 Vite 开发服务器，生产环境加载打包后的文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ==================== 应用生命周期管理 ====================

/**
 * 应用就绪事件处理
 * @description 当 Electron 完成初始化后执行，主要完成：
 *              1. 设置应用标识符（用于 Windows 任务栏分组）
 *              2. 注册窗口快捷键优化器
 *              3. 注册 IPC 处理器（代理服务）
 *              4. 创建主窗口
 */
app.whenReady().then(() => {
  // 设置应用 ID，用于 Windows 任务栏图标分组
  electronApp.setAppUserModelId('com.reader-source')

  // 监听窗口创建，自动注册开发者工具快捷键
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册 IPC 处理器
  ipcMain.on('ping', () => console.log('pong')) // 简单的连通性测试
  registerProxyHandlers() // 注册代理服务相关的 IPC 处理器（proxy:fetch, proxy:parse 等）

  createWindow()

  // macOS 特有行为：点击 Dock 图标时，如果没有窗口则创建新窗口
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

/**
 * 所有窗口关闭事件处理
 * @description 清理 Puppeteer 浏览器实例，并根据平台决定是否退出应用。
 *              macOS 上关闭窗口不退出应用（遵循 macOS 应用惯例）
 */
app.on('window-all-closed', async () => {
  // 关闭 Puppeteer 浏览器实例，释放资源
  await closeBrowser()
  // 非 macOS 平台：关闭所有窗口后退出应用
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 应用即将退出事件处理
 * @description 确保在应用退出前清理 Puppeteer 浏览器实例
 */
app.on('before-quit', async () => {
  await closeBrowser()
})
