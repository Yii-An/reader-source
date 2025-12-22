/// <reference types="vite/client" />

type RendererLogPayload = {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: unknown
  scope?: string
}

interface Window {
  api?: {
    proxy?: (url: string, userAgent?: string) => Promise<unknown>
    parse?: (
      html: string,
      options: {
        listRule?: string
        contentRule?: string
        fields?: Record<string, string>
        host?: string
        userAgent?: string
      }
    ) => Promise<unknown>
    executeJs?: (url: string, jsCode: string, userAgent?: string) => Promise<unknown>
    parseInPage?: (options: {
      url: string
      listRule?: string
      contentRule?: string
      fields?: Record<string, string>
      host?: string
      userAgent?: string
    }) => Promise<unknown>
    proxyImage?: (url: string, referer?: string) => Promise<unknown>
    log?: (payload: RendererLogPayload) => Promise<void>
    readLog?: () => Promise<string>
  }
}
