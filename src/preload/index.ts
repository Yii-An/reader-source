import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 暴露给渲染进程的 API
const api = {
  // HTTP 代理请求
  proxy: (url: string, userAgent?: string) => {
    return ipcRenderer.invoke('proxy:fetch', { url, userAgent })
  },
  // 渲染进程日志写入主进程
  log: (payload: { level: 'debug' | 'info' | 'warn' | 'error'; message: string; data?: unknown }) =>
    ipcRenderer.invoke('log:write', payload),
  // HTML 解析
  parse: (
    html: string,
    options: {
      listRule?: string
      contentRule?: string
      fields?: Record<string, string>
      host?: string
    }
  ) => {
    return ipcRenderer.invoke('proxy:parse', { html, ...options })
  },
  // 执行 JavaScript 规则
  executeJs: (url: string, jsCode: string, userAgent?: string) => {
    return ipcRenderer.invoke('proxy:executeJs', { url, jsCode, userAgent })
  },
  // 在页面上下文中解析（支持原生 XPath）
  parseInPage: (options: {
    url: string
    listRule?: string
    contentRule?: string
    fields?: Record<string, string>
    host?: string
    userAgent?: string
  }) => {
    return ipcRenderer.invoke('proxy:parseInPage', options)
  },
  // 代理获取图片（绕过防盗链）
  proxyImage: (url: string, referer?: string) => {
    return ipcRenderer.invoke('proxy:image', { url, referer })
  },
  // 读取主进程日志
  readLog: () => ipcRenderer.invoke('log:read')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore Allow exposing electron API when contextIsolation is disabled
  window.electron = electronAPI
  // @ts-ignore Allow exposing custom api when contextIsolation is disabled
  window.api = api
}
