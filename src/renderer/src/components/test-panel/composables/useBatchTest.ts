import { ref, type Ref } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import type {
  BatchTestConfig,
  BatchTestController,
  ChainTestResult,
  SearchResult,
  ChapterResult,
  CategoryGroup,
  DiscoverResult
} from '../../../types/batch-test'
import { createInitialChainResult as createChainResult } from '../../../types/batch-test'
import { useLogStore } from '../../../stores/logStore'
import { withTimeout, TimeoutError } from '../../../utils/timeout'
import { loadBatchTestConfig, saveBatchTestConfig } from '../../../utils/batch-test-config'

// Re-export types for backward compatibility
export type { ChainTestResult, SearchResult, ChapterResult, DiscoverResult, CategoryGroup }

/**
 * Batch test composable with sequential chain test support
 */
type UseBatchTestReturn = {
  config: Ref<BatchTestConfig>
  testing: Ref<boolean>
  runBatchTest: (
    sources: UniversalRule[],
    keyword: string,
    onUpdate: (id: string, result: ChainTestResult) => void
  ) => Promise<void>
  cancelTest: () => void
  retrySource: (
    source: UniversalRule,
    keyword: string,
    onUpdate: (id: string, result: ChainTestResult) => void
  ) => Promise<void>
  saveConfig: () => void
}

export function useBatchTest(): UseBatchTestReturn {
  const logStore = useLogStore()

  // Configuration state (loaded from localStorage)
  const config = ref<BatchTestConfig>(loadBatchTestConfig())
  const testing = ref(false)
  const controller = ref<BatchTestController | null>(null)

  // Save config when it changes
  function saveConfig(): void {
    saveBatchTestConfig(config.value)
  }

  /**
   * Build full URL from path and host
   */
  function buildFullUrl(url: string, host: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const baseHost = host.endsWith('/') ? host.slice(0, -1) : host
    const path = url.startsWith('/') ? url : '/' + url
    return baseHost + path
  }

  /**
   * Extract request host from URL
   */
  function getRequestHost(fullUrl: string, fallbackHost: string): string {
    try {
      return new URL(fullUrl).origin
    } catch {
      return fallbackHost
    }
  }

  /**
   * Parse list content using XPath or CSS selector
   */
  async function parseList(
    source: UniversalRule,
    url: string,
    listRule: string,
    fields: Record<string, string>
  ): Promise<{ data: unknown[]; rawHtml: string }> {
    const fullUrl = buildFullUrl(url, source.host)
    const requestHost = getRequestHost(fullUrl, source.host)
    const isXPath = listRule.startsWith('//') || listRule.startsWith('/')

    if (isXPath) {
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
      return { data: result.data || [], rawHtml: '(XPath 模式)' }
    } else {
      const proxyResult = await window.api.proxy(fullUrl, source.userAgent)
      if (!proxyResult.success) {
        throw new Error(proxyResult.error || '代理请求失败')
      }
      const rawHtml = proxyResult.html || ''

      const result = await window.api.parse(rawHtml, {
        listRule,
        fields,
        host: requestHost
      })
      if (!result.success) {
        throw new Error(result.error || '解析失败')
      }
      return { data: result.data || [], rawHtml }
    }
  }

  // ============ Chain Test Steps ============

  /**
   * Step 1: Search test
   */
  async function runSearchStep(
    source: UniversalRule,
    keyword: string,
    result: ChainTestResult,
    onUpdate: () => void
  ): Promise<boolean> {
    result.search.status = 'running'
    result.currentStep = 'search'
    onUpdate()

    const startTime = Date.now()

    if (!source.search?.url) {
      result.search.status = 'error'
      result.search.error = '未配置搜索规则'
      result.search.duration = Date.now() - startTime
      return false
    }

    try {
      const searchUrl = source.search.url
        .replace(/\$keyword|\{\{keyword\}\}/g, encodeURIComponent(keyword))
        .replace(/\$page|\{\{page\}\}/g, '1')

      const { data, rawHtml } = await parseList(source, searchUrl, source.search.list || '', {
        name: source.search.name || '@text',
        cover: source.search.cover || '',
        author: source.search.author || '',
        url: source.search.result || 'a@href'
      })

      result.search.results = data as SearchResult[]
      result.search.count = data.length
      result.search.rawHtml = rawHtml
      result.search.duration = Date.now() - startTime

      if (data.length > 0) {
        result.search.selectedItem = data[0] as SearchResult
        result.search.status = 'success'
        return true
      } else {
        result.search.status = 'error'
        result.search.error = '搜索结果为空'
        return false
      }
    } catch (error) {
      result.search.status = 'error'
      result.search.error = error instanceof Error ? error.message : String(error)
      result.search.duration = Date.now() - startTime
      return false
    }
  }

  /**
   * Step 2: Chapter test
   */
  async function runChapterStep(
    source: UniversalRule,
    bookUrl: string,
    result: ChainTestResult,
    onUpdate: () => void
  ): Promise<boolean> {
    result.chapter.status = 'running'
    result.currentStep = 'chapter'
    onUpdate()

    const startTime = Date.now()

    if (!source.chapter?.list) {
      result.chapter.status = 'error'
      result.chapter.error = '未配置章节规则'
      result.chapter.duration = Date.now() - startTime
      return false
    }

    try {
      const chapterUrl = source.chapter.url
        ? source.chapter.url.replace(/\$result|\{\{result\}\}/g, bookUrl)
        : bookUrl

      const { data, rawHtml } = await parseList(source, chapterUrl, source.chapter.list || '', {
        name: source.chapter.name || '@text',
        url: source.chapter.result || 'a@href'
      })

      result.chapter.results = data as ChapterResult[]
      result.chapter.count = data.length
      result.chapter.rawHtml = rawHtml
      result.chapter.duration = Date.now() - startTime

      if (data.length > 0) {
        result.chapter.selectedItem = data[0] as ChapterResult
        result.chapter.status = 'success'
        return true
      } else {
        result.chapter.status = 'error'
        result.chapter.error = '章节列表为空'
        return false
      }
    } catch (error) {
      result.chapter.status = 'error'
      result.chapter.error = error instanceof Error ? error.message : String(error)
      result.chapter.duration = Date.now() - startTime
      return false
    }
  }

  /**
   * Step 3: Content test
   */
  async function runContentStep(
    source: UniversalRule,
    chapterUrl: string,
    result: ChainTestResult,
    onUpdate: () => void
  ): Promise<boolean> {
    result.content.status = 'running'
    result.currentStep = 'content'
    onUpdate()

    const startTime = Date.now()

    if (!source.content?.items) {
      result.content.status = 'error'
      result.content.error = '未配置正文规则'
      result.content.duration = Date.now() - startTime
      return false
    }

    try {
      const contentUrl = source.content.url
        ? source.content.url.replace(/\$result|\{\{result\}\}/g, chapterUrl)
        : chapterUrl

      const fullUrl = buildFullUrl(contentUrl, source.host)
      const requestHost = getRequestHost(fullUrl, source.host)

      const proxyResult = await window.api.proxy(fullUrl, source.userAgent)
      if (!proxyResult.success) {
        throw new Error(proxyResult.error || '代理请求失败')
      }

      const rawHtml = proxyResult.html || ''
      const contentItems = source.content.items || ''

      // Parse content - for content we parse directly without list
      const parseResult = await window.api.parse(rawHtml, {
        listRule: '',
        fields: { content: contentItems },
        host: requestHost
      })

      if (!parseResult.success) {
        throw new Error(parseResult.error || '解析失败')
      }

      // Extract content text
      const data = parseResult.data || []
      const contentText: string[] = []
      for (const item of data) {
        if (typeof item === 'object' && item !== null && 'content' in item) {
          contentText.push(String((item as { content: unknown }).content))
        }
      }

      result.content.content = contentText
      result.content.count = contentText.length
      result.content.rawHtml = rawHtml
      result.content.duration = Date.now() - startTime

      if (contentText.length > 0) {
        result.content.status = 'success'
        return true
      } else {
        result.content.status = 'error'
        result.content.error = '正文内容为空'
        return false
      }
    } catch (error) {
      result.content.status = 'error'
      result.content.error = error instanceof Error ? error.message : String(error)
      result.content.duration = Date.now() - startTime
      return false
    }
  }

  /**
   * Step 4: Discover test (with categories)
   */
  async function runDiscoverStep(
    source: UniversalRule,
    result: ChainTestResult,
    onUpdate: () => void
  ): Promise<boolean> {
    if (!result.hasDiscover) {
      result.discover.status = 'skipped'
      return true
    }

    result.discover.status = 'running'
    result.currentStep = 'discover'
    onUpdate()

    const startTime = Date.now()

    try {
      const discoverUrlRaw = source.discover!.url!.trim()

      // Parse categories from discover URL
      let rawList: string[] = []

      if (discoverUrlRaw.startsWith('@js:')) {
        const jsCode = discoverUrlRaw.slice(4).trim()
        const jsResult = await window.api.executeJs('about:blank', jsCode, source.userAgent)
        if (!jsResult.success) {
          throw new Error(jsResult.error || 'JavaScript 执行失败')
        }
        if (Array.isArray(jsResult.data)) {
          rawList = jsResult.data.map(String)
        } else if (typeof jsResult.data === 'string') {
          rawList = jsResult.data.split('\n').filter((s: string) => s.trim())
        }
      } else {
        rawList = discoverUrlRaw.split('\n').filter((line) => line.trim())
      }

      // Parse category groups
      const groupMap = new Map<string, { name: string; url: string }[]>()

      for (const item of rawList) {
        const parts = item.split('::').map((s) => s.trim())
        if (parts.length === 2) {
          const [name, url] = parts
          groupMap.set(name, [{ name, url }])
        } else if (parts.length >= 3) {
          const groupName = parts[0]
          const itemName = parts[1]
          const url = parts.slice(2).join('::')
          if (!groupMap.has(groupName)) groupMap.set(groupName, [])
          groupMap.get(groupName)!.push({ name: itemName, url })
        }
      }

      result.discover.groups = Array.from(groupMap, ([name, items]) => ({ name, items }))

      // If categories loaded, run discover with the first category
      if (result.discover.groups.length > 0) {
        const firstGroup = result.discover.groups[0]
        const firstItem = firstGroup.items[0]
        const discoverUrl = firstItem.url.replace(/\$page|\{\{page\}\}/g, '1')

        const { data, rawHtml } = await parseList(
          source,
          discoverUrl,
          source.discover!.list || '',
          {
            name: source.discover!.name || '@text',
            cover: source.discover!.cover || '',
            author: source.discover!.author || '',
            url: source.discover!.result || 'a@href'
          }
        )

        result.discover.results = data as DiscoverResult[]
        result.discover.count = data.length
        result.discover.rawHtml = rawHtml
      }

      result.discover.duration = Date.now() - startTime
      result.discover.status = 'success'
      return true
    } catch (error) {
      result.discover.status = 'error'
      result.discover.error = error instanceof Error ? error.message : String(error)
      result.discover.duration = Date.now() - startTime
      return false
    }
  }

  // ============ Main Chain Test ============

  /**
   * Run chain test for a single source: Search → Chapter → Content → Discover
   */
  async function runChainTestSingle(
    source: UniversalRule,
    keyword: string,
    onUpdate: (result: ChainTestResult) => void
  ): Promise<ChainTestResult> {
    const hasDiscover = !!source.discover?.url
    const result = createChainResult(hasDiscover)
    const startTime = Date.now()

    const update: () => void = () => onUpdate(result)

    // Step 1: Search
    const searchSuccess = await runSearchStep(source, keyword, result, update)
    if (!searchSuccess) {
      result.currentStep = 'completed'
      result.totalDuration = Date.now() - startTime
      update()
      return result
    }

    // Step 2: Chapter (use first search result)
    const bookUrl = result.search.selectedItem!.url
    const chapterSuccess = await runChapterStep(source, bookUrl, result, update)
    if (!chapterSuccess) {
      result.currentStep = 'completed'
      result.totalDuration = Date.now() - startTime
      update()
      return result
    }

    // Step 3: Content (use first chapter)
    const chapterUrl = result.chapter.selectedItem!.url
    await runContentStep(source, chapterUrl, result, update)

    // Step 4: Discover (if available)
    await runDiscoverStep(source, result, update)

    result.currentStep = 'completed'
    result.totalDuration = Date.now() - startTime
    update()

    return result
  }

  /**
   * Run batch chain test for multiple sources
   */
  async function runBatchTest(
    sources: UniversalRule[],
    keyword: string,
    onUpdate: (id: string, result: ChainTestResult) => void
  ): Promise<void> {
    if (sources.length === 0) return

    testing.value = true
    const ctrl: BatchTestController = {
      isCancelled: false,
      abortControllers: [],
      cancel: () => {
        ctrl.isCancelled = true
        ctrl.abortControllers.forEach((ac) => ac.abort())
        ctrl.abortControllers = []
      }
    }
    controller.value = ctrl

    logStore.info(`[批量测试] 开始测试 ${sources.length} 个书源，关键词: ${keyword}`)

    // Initialize all results as pending
    for (const source of sources) {
      const hasDiscover = !!source.discover?.url
      onUpdate(source.id, createChainResult(hasDiscover))
    }

    // Run tests with concurrency control
    const concurrency = config.value.concurrency
    const executing: Promise<void>[] = []

    for (const source of sources) {
      if (ctrl.isCancelled) break

      const promise = (async () => {
        if (ctrl.isCancelled) return

        try {
          await withTimeout(
            runChainTestSingle(source, keyword, (result) => onUpdate(source.id, result)),
            config.value.timeout
          )
        } catch (error) {
          if (error instanceof TimeoutError) {
            const hasDiscover = !!source.discover?.url
            const result = createChainResult(hasDiscover)
            result.currentStep = 'completed'
            result.search.status = 'error'
            result.search.error = '测试超时'
            onUpdate(source.id, result)
          }
        }
      })().then(() => {
        const idx = executing.indexOf(promise)
        if (idx > -1) executing.splice(idx, 1)
      })

      executing.push(promise)

      if (executing.length >= concurrency) {
        await Promise.race(executing)
      }
    }

    await Promise.all(executing)

    testing.value = false
    controller.value = null
    logStore.info('[批量测试] 测试完成')
  }

  /**
   * Cancel ongoing tests
   */
  function cancelTest(): void {
    if (controller.value) {
      controller.value.cancel()
      testing.value = false
      logStore.info('[批量测试] 测试已取消')
    }
  }

  /**
   * Retry a single source
   */
  async function retrySource(
    source: UniversalRule,
    keyword: string,
    onUpdate: (id: string, result: ChainTestResult) => void
  ): Promise<void> {
    const hasDiscover = !!source.discover?.url
    onUpdate(source.id, createChainResult(hasDiscover))

    await runChainTestSingle(source, keyword, (result) => onUpdate(source.id, result))
  }

  return {
    config,
    testing,
    runBatchTest,
    cancelTest,
    retrySource,
    saveConfig
  }
}
