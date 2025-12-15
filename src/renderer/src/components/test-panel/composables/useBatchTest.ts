import type { UniversalRule } from '../../../types/universal'
import { useLogStore } from '../../../stores/logStore'

/**
 * 批量测试结果接口
 */
export interface BatchTestResult {
  /** 测试状态 */
  status: 'pending' | 'running' | 'success' | 'error'
  /** 成功时的结果数量 */
  count: number
  /** 错误信息 */
  error?: string
  /** 测试耗时（毫秒） */
  duration?: number
  /** 可视化数据（搜索结果列表） */
  visualData?: SearchResult[]
  /** 解析后的结构化数据 */
  parsedResult?: unknown[]
  /** 原始 HTML */
  rawHtml?: string
}

/**
 * 批量搜索结果
 */
export interface SearchResult {
  name: string
  url: string
  cover?: string
  author?: string
}

/**
 * 批量测试功能 Composable
 */
export function useBatchTest(): {
  runBatchTest: (
    sources: UniversalRule[],
    keyword: string,
    onUpdate: (id: string, result: BatchTestResult) => void
  ) => Promise<void>
  testSingleSource: (source: UniversalRule, keyword: string) => Promise<BatchTestResult>
} {
  const logStore = useLogStore()

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
   * 对单个书源执行搜索测试
   */
  async function testSingleSource(
    source: UniversalRule,
    keyword: string
  ): Promise<BatchTestResult> {
    const startTime = Date.now()

    if (!source.search?.url) {
      return {
        status: 'error',
        count: 0,
        error: '未配置搜索规则',
        duration: Date.now() - startTime
      }
    }

    try {
      // 构建搜索 URL
      const searchUrl = source.search.url
        .replace(/\$keyword|\{\{keyword\}\}/g, encodeURIComponent(keyword))
        .replace(/\$page|\{\{page\}\}/g, '1')

      const fullUrl = buildFullUrl(searchUrl, source.host)

      // 从请求 URL 中提取 origin
      let requestHost = source.host
      try {
        const urlObj = new URL(fullUrl)
        requestHost = urlObj.origin
      } catch {
        // URL 解析失败时使用规则的 host
      }

      const listRule = source.search.list || ''
      const fields = {
        name: source.search.name || '@text',
        cover: source.search.cover || '',
        author: source.search.author || '',
        url: source.search.result || 'a@href'
      }

      const isXPath = listRule.startsWith('//') || listRule.startsWith('/')

      let data: unknown[]
      let rawHtml = ''

      if (isXPath) {
        // XPath 模式
        const result = await window.api.parseInPage({
          url: fullUrl,
          listRule,
          fields,
          host: requestHost,
          userAgent: source.userAgent
        })
        if (!result.success) {
          throw new Error(result.error || '解析失败')
        }
        data = result.data || []
        rawHtml = '(XPath 模式下在浏览器中解析，无原始 HTML)'
      } else {
        // CSS 模式
        const proxyResult = await window.api.proxy(fullUrl, source.userAgent)
        if (!proxyResult.success) {
          throw new Error(proxyResult.error || '代理请求失败')
        }
        rawHtml = proxyResult.html || ''

        const result = await window.api.parse(rawHtml, {
          listRule,
          fields,
          host: requestHost
        })
        if (!result.success) {
          throw new Error(result.error || '解析失败')
        }
        data = result.data || []
      }

      return {
        status: 'success',
        count: data.length,
        duration: Date.now() - startTime,
        visualData: data as SearchResult[],
        parsedResult: data,
        rawHtml
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        status: 'error',
        count: 0,
        error: message,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 执行批量测试
   * @param sources 要测试的书源列表
   * @param keyword 搜索关键词
   * @param onUpdate 状态更新回调
   */
  async function runBatchTest(
    sources: UniversalRule[],
    keyword: string,
    onUpdate: (id: string, result: BatchTestResult) => void
  ): Promise<void> {
    logStore.info(`[批量测试] 开始测试 ${sources.length} 个书源，关键词: "${keyword}"`)

    // 初始化所有源为 pending 状态
    for (const source of sources) {
      onUpdate(source.id, { status: 'pending', count: 0 })
    }

    // 并发限制为 3
    const concurrency = 3
    const executing: Promise<void>[] = []

    const processSource = async (source: UniversalRule): Promise<void> => {
      // 更新为 running 状态
      onUpdate(source.id, { status: 'running', count: 0 })

      // 执行测试
      const result = await testSingleSource(source, keyword)
      onUpdate(source.id, result)

      if (result.status === 'success') {
        logStore.debug(
          `[批量测试] ✅ ${source.name}: ${result.count} 条结果 (${result.duration}ms)`
        )
      } else {
        logStore.debug(`[批量测试] ❌ ${source.name}: ${result.error}`)
      }
    }

    // 使用简单的并发控制
    for (const source of sources) {
      const promise = processSource(source).then(() => {
        const idx = executing.indexOf(promise)
        if (idx > -1) executing.splice(idx, 1)
      })
      executing.push(promise)

      if (executing.length >= concurrency) {
        await Promise.race(executing)
      }
    }

    // 等待所有任务完成
    await Promise.all(executing)

    // 统计结果
    logStore.info(`[批量测试] 测试完成`)
  }

  return {
    runBatchTest,
    testSingleSource
  }
}
