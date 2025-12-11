import { ElectronAPI } from '@electron-toolkit/preload'

interface ProxyResult {
  success: boolean
  html?: string
  url?: string
  error?: string
}

interface ParseResult {
  success: boolean
  data?: any[]
  error?: string
}

interface ExecuteJsResult {
  success: boolean
  data?: any
  error?: string
}

interface ProxyImageResult {
  success: boolean
  dataUrl?: string
  error?: string
}

interface API {
  proxy: (url: string, userAgent?: string) => Promise<ProxyResult>
  parse: (
    html: string,
    options: {
      listRule?: string
      contentRule?: string
      fields?: Record<string, string>
      host?: string
    }
  ) => Promise<ParseResult>
  parseInPage: (options: {
    url: string
    listRule?: string
    contentRule?: string
    fields?: Record<string, string>
    host?: string
    userAgent?: string
  }) => Promise<ParseResult>
  executeJs: (url: string, jsCode: string, userAgent?: string) => Promise<ExecuteJsResult>
  proxyImage: (url: string, referer?: string) => Promise<ProxyImageResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}

export { ProxyResult, ParseResult, API }
