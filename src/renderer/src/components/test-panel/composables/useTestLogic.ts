import { ref, type Ref } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import { useLogStore } from '../../../stores/logStore'

/**
 * 解析结果类型
 */
export interface ParseResult {
  data: unknown[]
  nextUrl?: string
}

/**
 * 测试逻辑通用功能
 * @param getRule getter 函数，每次调用返回最新的规则配置（确保 userAgent 等配置的修改能即时生效）
 */
export function useTestLogic(getRule: () => UniversalRule): {
  testing: Ref<boolean>
  rawHtml: Ref<string>
  buildFullUrl: (url: string, host: string) => string
  fetchHtml: (url: string) => Promise<string>
  parseContent: (
    url: string,
    listRule: string,
    fields: Record<string, string>,
    nextUrlRule?: string
  ) => Promise<ParseResult>
} {
  const logStore = useLogStore()
  const testing = ref(false)
  const rawHtml = ref('')

  /**
   * 构建完整 URL
   */
  function buildFullUrl(url: string, host: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const baseHost = host.endsWith('/') ? host.slice(0, -1) : host
    const path = url.startsWith('/') ? url : '/' + url
    return baseHost + path
  }

  /**
   * 获取 HTML 内容
   */
  async function fetchHtml(url: string): Promise<string> {
    const rule = getRule()
    const proxyResult = await window.api.proxy(url, rule.userAgent)
    if (!proxyResult.success) {
      throw new Error(proxyResult.error || '代理请求失败')
    }
    logStore.debug(`获取到 HTML，长度: ${proxyResult.html?.length}`)
    return proxyResult.html || ''
  }

  /**
   * 解析内容
   * @param url 请求的页面 URL
   * @param listRule 列表选择器规则
   * @param fields 字段映射
   * @param nextUrlRule 下一页链接选择器规则（可选）
   * @returns 解析结果（数据数组 + 可选的下一页链接）
   */
  async function parseContent(
    url: string,
    listRule: string,
    fields: Record<string, string>,
    nextUrlRule?: string
  ): Promise<ParseResult> {
    const rule = getRule()
    const isXPath = listRule.startsWith('//') || listRule.startsWith('/')
    const ruleType = isXPath ? 'XPath' : 'CSS'

    // 详细的解析请求日志
    logStore.info(`[解析] 开始解析 (${ruleType} 模式)`)
    logStore.debug(`[解析] URL: ${url}`)
    logStore.debug(`[解析] 列表规则: ${listRule}`)
    logStore.debug(`[解析] 字段映射: ${JSON.stringify(fields)}`)
    if (nextUrlRule) {
      logStore.debug(`[解析] 下一页规则: ${nextUrlRule}`)
    }

    // 从请求 URL 中提取 origin，用于相对 URL 的拼接
    // 这样可以确保相对路径使用正确的域名
    let requestHost = rule.host
    try {
      const urlObj = new URL(url)
      requestHost = urlObj.origin
    } catch {
      // URL 解析失败时使用规则的 host
    }

    if (isXPath) {
      logStore.debug('[XPath] 使用原生 document.evaluate() 解析')
      rawHtml.value = '(XPath 模式下在浏览器中解析)'
      const result = await window.api.parseInPage({
        url,
        listRule,
        fields,
        host: requestHost,
        userAgent: rule.userAgent
      })
      if (!result.success) {
        logStore.error(`[解析] 失败: ${result.error}`)
        throw new Error(result.error || '解析失败')
      }
      logStore.info(`[解析] 完成，获取 ${result.data?.length || 0} 条结果`)
      // XPath 模式暂不支持提取 nextUrl
      return { data: result.data || [] }
    } else {
      const html = await fetchHtml(url)
      rawHtml.value = html

      // 解析列表数据
      const result = await window.api.parse(html, {
        listRule,
        fields,
        host: requestHost
      })
      if (!result.success) {
        logStore.error(`[解析] 失败: ${result.error}`)
        throw new Error(result.error || '解析失败')
      }
      logStore.info(`[解析] 完成，获取 ${result.data?.length || 0} 条结果`)

      // 如果有 nextUrl 规则，同时提取下一页链接
      let nextUrl: string | undefined
      if (nextUrlRule) {
        try {
          const nextUrlResult = await window.api.parse(html, {
            fields: { nextUrl: nextUrlRule },
            host: requestHost
          })
          if (nextUrlResult.success && nextUrlResult.data?.[0]?.nextUrl) {
            nextUrl = nextUrlResult.data[0].nextUrl as string
            logStore.info(`[分页] 下一页链接: ${nextUrl}`)
          } else {
            logStore.debug(`[分页] 未找到下一页链接 (规则: ${nextUrlRule})`)
          }
        } catch (e) {
          logStore.debug(`[分页] 提取下一页链接失败: ${e}`)
        }
      }

      return { data: result.data || [], nextUrl }
    }
  }

  return {
    testing,
    rawHtml,
    buildFullUrl,
    fetchHtml,
    parseContent
  }
}
