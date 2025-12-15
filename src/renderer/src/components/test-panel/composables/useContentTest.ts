import { ref, type Ref, computed } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import { UniversalContentType } from '../../../types/universal'
import { useLogStore } from '../../../stores/logStore'
import { useTestLogic } from './useTestLogic'

export function useContentTest(rule: Ref<UniversalRule>): {
  url: Ref<string>
  content: Ref<string[]>
  isManga: Ref<boolean>
  runTest: () => Promise<void>
} {
  const logStore = useLogStore()
  const url = ref('')
  const content = ref<string[]>([])

  const { buildFullUrl, fetchHtml, testing, rawHtml } = useTestLogic(rule.value)

  const isManga = computed(() => rule.value.contentType === UniversalContentType.MANGA)

  async function runTest(): Promise<void> {
    if (!url.value) {
      logStore.error('请输入正文URL')
      return
    }

    testing.value = true
    try {
      const contentUrlFinal = rule.value.content?.url
        ? rule.value.content.url.replace(/\$result|\{\{result\}\}/g, url.value)
        : url.value

      const fullUrl = buildFullUrl(contentUrlFinal, rule.value.host)
      logStore.debug(`请求 URL: ${fullUrl}`)

      const contentRule = rule.value.content?.items || ''

      // 检测是否为 JavaScript 规则
      const isJsRule =
        /function\s+\w+\s*\(|var\s+\w+\s*=|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*{|\.match\(|\.replace\(/.test(
          contentRule
        )

      if (isJsRule) {
        logStore.debug('检测到 JavaScript 规则，使用 executeJs')
        const jsResult = await window.api.executeJs(fullUrl, contentRule, rule.value.userAgent)

        if (!jsResult.success) {
          throw new Error(jsResult.error || 'JavaScript 执行失败')
        }

        let imageUrls: string[] = []

        if (Array.isArray(jsResult.data)) {
          if (
            jsResult.data.length > 0 &&
            typeof jsResult.data[0] === 'object' &&
            jsResult.data[0] !== null &&
            'url' in jsResult.data[0]
          ) {
            imageUrls = jsResult.data.map((item: unknown) =>
              String((item as { url?: string }).url || '')
            )
          } else {
            content.value = jsResult.data.map(String)
          }
        } else if (typeof jsResult.data === 'string') {
          try {
            const parsed = JSON.parse(jsResult.data)
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.url) {
              imageUrls = parsed.map((item: { url?: string }) => String(item.url || ''))
            } else {
              content.value = [jsResult.data]
            }
          } catch {
            content.value = [jsResult.data]
          }
        } else {
          content.value = [JSON.stringify(jsResult.data, null, 2)]
        }

        if (isManga.value && imageUrls.length > 0) {
          logStore.debug(`通过代理获取 ${imageUrls.length} 张图片...`)
          const proxyResults = await Promise.all(
            imageUrls.map((imgUrl) => window.api.proxyImage(imgUrl, rule.value.host))
          )
          content.value = proxyResults.map((result, index) =>
            result.success ? result.dataUrl! : imageUrls[index]
          )
        } else if (imageUrls.length > 0) {
          content.value = imageUrls
        }

        logStore.info(`获取到 ${content.value.length} 段内容`)
      } else {
        const html = await fetchHtml(fullUrl)
        rawHtml.value = html
        const parseResult = await window.api.parse(html, { contentRule })

        if (!parseResult.success) {
          throw new Error(parseResult.error || '解析失败')
        }

        content.value = parseResult.data || []
        logStore.info(`获取到 ${content.value.length} 段内容`)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logStore.error(`正文测试失败: ${message}`)
      throw error
    } finally {
      testing.value = false
    }
  }

  return {
    url,
    content,
    isManga,
    runTest
  }
}
