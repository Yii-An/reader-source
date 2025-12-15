import { ref, type Ref } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import { useLogStore } from '../../../stores/logStore'
import { useTestLogic } from './useTestLogic'

export interface ChapterResult {
  name: string
  url: string
}

export function useChapterTest(rule: Ref<UniversalRule>): {
  url: Ref<string>
  results: Ref<ChapterResult[]>
  runTest: () => Promise<void>
} {
  const logStore = useLogStore()
  const url = ref('')
  const results = ref<ChapterResult[]>([])

  const { buildFullUrl, parseContent, testing } = useTestLogic(rule.value)

  async function runTest(): Promise<void> {
    if (!url.value) {
      logStore.error('请输入章节页URL')
      return
    }

    testing.value = true
    try {
      // 章节规则详情日志
      logStore.info(`[章节] 开始获取章节列表`)
      logStore.debug(`[章节] 输入 URL: ${url.value}`)
      logStore.debug(`[章节] 规则配置:`)
      logStore.debug(`  ├── url模板: ${rule.value.chapter?.url || '(直接使用输入URL)'}`)
      logStore.debug(`  ├── list: ${rule.value.chapter?.list || '(未设置)'}`)
      logStore.debug(`  ├── name: ${rule.value.chapter?.name || '@text'}`)
      logStore.debug(`  └── result: ${rule.value.chapter?.result || 'a@href'}`)

      const chapterUrlFinal = rule.value.chapter?.url
        ? rule.value.chapter.url.replace(/\$result|\{\{result\}\}/g, url.value)
        : url.value

      const fullUrl = buildFullUrl(chapterUrlFinal, rule.value.host)
      logStore.info(`[章节] 请求 URL: ${fullUrl}`)

      const data = await parseContent(fullUrl, rule.value.chapter?.list || '', {
        name: rule.value.chapter?.name || '@text',
        url: rule.value.chapter?.result || 'a@href'
      })

      results.value = data as ChapterResult[]
      logStore.info(`[章节] ✅ 找到 ${data.length} 个章节`)

      // 打印前5条章节
      if (data.length > 0) {
        logStore.debug(`[章节] 前${Math.min(5, data.length)}条:`)
        ;(data as ChapterResult[]).slice(0, 5).forEach((item, idx) => {
          logStore.debug(`  ${idx + 1}. ${item.name} → ${item.url?.substring(0, 50)}...`)
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logStore.error(`[章节] ❌ 失败: ${message}`)
      throw error
    } finally {
      testing.value = false
    }
  }

  return {
    url,
    results,
    runTest
  }
}
