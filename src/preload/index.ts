import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 暴露给渲染进程的 API
const api = {
  // HTTP 代理请求
  proxy: (url: string, userAgent?: string) => {
    return ipcRenderer.invoke('proxy:fetch', { url, userAgent })
  },
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
  // 代理获取图片（绕过防盗链）
  proxyImage: (url: string, referer?: string) => {
    return ipcRenderer.invoke('proxy:image', { url, referer })
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
