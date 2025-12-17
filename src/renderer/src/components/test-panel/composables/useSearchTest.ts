import { ref, type Ref } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import { useLogStore } from '../../../stores/logStore'
import { useTestLogic } from './useTestLogic'

export interface SearchResult {
  name: string
  url: string
  cover?: string
  author?: string
}

export function useSearchTest(rule: Ref<UniversalRule>): {
  keyword: Ref<string>
  results: Ref<SearchResult[]>
  runTest: () => Promise<void>
} {
  const logStore = useLogStore()
  const keyword = ref('')
  const results = ref<SearchResult[]>([])

  const { buildFullUrl, parseContent, testing } = useTestLogic(rule.value)

  async function runTest(): Promise<void> {
    if (!keyword.value || !rule.value.search?.url) {
      logStore.error('请输入搜索关键词并配置搜索URL')
      return
    }

    testing.value = true
    try {
      // 搜索规则详情日志
      logStore.info(`[搜索] 开始搜索: "${keyword.value}"`)
      logStore.debug(`[搜索] 规则配置:`)
      logStore.debug(`  ├── url模板: ${rule.value.search.url}`)
      logStore.debug(`  ├── list: ${rule.value.search.list || '(未设置)'}`)
      logStore.debug(`  ├── name: ${rule.value.search.name || '@text'}`)
      logStore.debug(`  ├── result: ${rule.value.search.result || 'a@href'}`)
      logStore.debug(`  └── author: ${rule.value.search.author || '(未设置)'}`)

      const searchUrl = rule.value.search.url
        .replace(/\$keyword|\{\{keyword\}\}/g, encodeURIComponent(keyword.value))
        .replace(/\$page|\{\{page\}\}/g, '1')

      const fullUrl = buildFullUrl(searchUrl, rule.value.host)
      logStore.info(`[搜索] 请求 URL: ${fullUrl}`)

      const result = await parseContent(fullUrl, rule.value.search.list || '', {
        name: rule.value.search.name || '@text',
        cover: rule.value.search.cover || '',
        author: rule.value.search.author || '',
        url: rule.value.search.result || 'a@href'
      })

      results.value = result.data as SearchResult[]
      logStore.info(`[搜索] ✅ 找到 ${result.data.length} 个结果`)

      // 打印前3条结果详情
      if (result.data.length > 0) {
        logStore.debug(`[搜索] 前${Math.min(3, result.data.length)}条结果:`)
        ;(result.data as SearchResult[]).slice(0, 3).forEach((item, idx) => {
          logStore.debug(`  ${idx + 1}. ${item.name} | ${item.url?.substring(0, 60)}...`)
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logStore.error(`[搜索] ❌ 失败: ${message}`)
      throw error
    } finally {
      testing.value = false
    }
  }

  return {
    keyword,
    results,
    runTest
  }
}
