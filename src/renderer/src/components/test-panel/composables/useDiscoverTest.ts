import { ref, type Ref } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import { useLogStore } from '../../../stores/logStore'
import { useTestLogic } from './useTestLogic'

export interface DiscoverResult {
  name: string
  url: string
  cover?: string
  author?: string
}

export interface CategoryGroup {
  name: string
  items: { name: string; url: string }[]
}

export function useDiscoverTest(rule: Ref<UniversalRule>): {
  groups: Ref<CategoryGroup[]>
  selectedGroupIndex: Ref<number>
  selectedItemIndex: Ref<number>
  results: Ref<DiscoverResult[]>
  categoriesLoading: Ref<boolean>
  loadCategories: () => Promise<void>
  selectGroup: (index: number) => Promise<void>
  selectItem: (index: number) => Promise<void>
  runTest: () => Promise<void>
} {
  const logStore = useLogStore()
  const groups = ref<CategoryGroup[]>([])
  const selectedGroupIndex = ref(0)
  const selectedItemIndex = ref(0)
  const results = ref<DiscoverResult[]>([])
  const categoriesLoading = ref(false)

  const { buildFullUrl, parseContent, testing } = useTestLogic(rule.value)

  async function loadCategories(): Promise<void> {
    if (!rule.value.discover?.url) return

    categoriesLoading.value = true
    const discoverUrlRaw = rule.value.discover.url.trim()

    logStore.info('[发现] 开始加载分类列表')
    logStore.debug(
      `[发现] 规则类型: ${discoverUrlRaw.startsWith('@js:') ? 'JavaScript' : '文本列表'}`
    )

    try {
      let rawList: string[] = []

      // 检查是否为 @js: 规则
      if (discoverUrlRaw.startsWith('@js:')) {
        logStore.debug('[发现] 执行 JavaScript 获取分类列表...')
        const jsCode = discoverUrlRaw.slice(4).trim()
        const jsResult = await window.api.executeJs('about:blank', jsCode, rule.value.userAgent)

        if (!jsResult.success) {
          throw new Error(jsResult.error || 'JavaScript 执行失败')
        }

        if (Array.isArray(jsResult.data)) {
          rawList = jsResult.data.map(String)
        } else if (typeof jsResult.data === 'string') {
          rawList = jsResult.data.split('\n').filter((s: string) => s.trim())
        }
      } else {
        // 普通文本规则（多行格式）
        rawList = discoverUrlRaw.split('\n').filter((line) => line.trim())
      }

      logStore.debug(`[发现] 解析到 ${rawList.length} 条原始分类规则`)

      // 解析分类列表为分组结构
      const groupMap = new Map<string, { name: string; url: string }[]>()

      for (const item of rawList) {
        const parts = item.split('::').map((s) => s.trim())
        if (parts.length === 2) {
          // 两段式规则：分类名::URL，每个分类独立成组
          const [name, url] = parts
          groupMap.set(name, [{ name, url }])
        } else if (parts.length >= 3) {
          // 三段式规则：分组::分类名::URL
          const groupName = parts[0]
          const itemName = parts[1]
          const url = parts.slice(2).join('::')
          if (!groupMap.has(groupName)) groupMap.set(groupName, [])
          groupMap.get(groupName)!.push({ name: itemName, url })
        }
        // 忽略无效的单段式规则
      }

      groups.value = Array.from(groupMap, ([name, items]) => ({ name, items }))
      selectedGroupIndex.value = 0
      selectedItemIndex.value = 0

      logStore.info(`[发现] ✅ 加载了 ${groups.value.length} 个分组`)
      if (groups.value.length > 0) {
        logStore.debug('[发现] 分组列表:')
        groups.value.slice(0, 5).forEach((g, i) => {
          logStore.debug(`  ${i + 1}. ${g.name} (${g.items.length}项)`)
        })
        if (groups.value.length > 5) {
          logStore.debug(`  ... 还有 ${groups.value.length - 5} 个分组`)
        }
      }

      // 自动加载第一个分类的数据
      if (groups.value.length > 0) {
        await runTest()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logStore.error(`[发现] ❌ 加载分类失败: ${message}`)
      throw error
    } finally {
      categoriesLoading.value = false
    }
  }

  async function selectGroup(gIdx: number): Promise<void> {
    selectedGroupIndex.value = gIdx
    selectedItemIndex.value = 0
    await runTest()
  }

  async function selectItem(iIdx: number): Promise<void> {
    selectedItemIndex.value = iIdx
    await runTest()
  }

  async function runTest(): Promise<void> {
    if (!rule.value.discover?.url) {
      logStore.error('请配置发现URL')
      return
    }

    // 如果没有分类，先加载分类列表
    if (groups.value.length === 0) {
      await loadCategories()
      return
    }

    // 获取当前选中的分类
    const currentGroup = groups.value[selectedGroupIndex.value]
    if (!currentGroup || currentGroup.items.length === 0) {
      logStore.error('请选择一个分类')
      return
    }

    testing.value = true
    try {
      const safeItemIndex = Math.min(selectedItemIndex.value, currentGroup.items.length - 1)
      const selectedItem = currentGroup.items[safeItemIndex]

      // 详细的发现测试日志
      logStore.info(`[发现] 开始获取: ${currentGroup.name} → ${selectedItem.name}`)
      logStore.debug(`[发现] 规则配置:`)
      logStore.debug(`  ├── list: ${rule.value.discover.list || '(未设置)'}`)
      logStore.debug(`  ├── name: ${rule.value.discover.name || '@text'}`)
      logStore.debug(`  ├── result: ${rule.value.discover.result || 'a@href'}`)
      logStore.debug(`  └── author: ${rule.value.discover.author || '(未设置)'}`)

      let discoverUrl = selectedItem.url
      discoverUrl = discoverUrl.replace(/\$page|\{\{page\}\}/g, '1')

      const fullUrl = buildFullUrl(discoverUrl, rule.value.host)
      logStore.info(`[发现] 请求 URL: ${fullUrl}`)

      const result = await parseContent(fullUrl, rule.value.discover.list || '', {
        name: rule.value.discover.name || '@text',
        cover: rule.value.discover.cover || '',
        author: rule.value.discover.author || '',
        url: rule.value.discover.result || 'a@href'
      })

      results.value = result.data as DiscoverResult[]
      logStore.info(`[发现] ✅ 找到 ${result.data.length} 个结果`)

      // 打印前3条结果
      if (result.data.length > 0) {
        logStore.debug(`[发现] 前${Math.min(3, result.data.length)}条结果:`)
        ;(result.data as DiscoverResult[]).slice(0, 3).forEach((item, idx) => {
          logStore.debug(`  ${idx + 1}. ${item.name} | ${item.url?.substring(0, 50)}...`)
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logStore.error(`[发现] ❌ 失败: ${message}`)
      throw error
    } finally {
      testing.value = false
    }
  }

  return {
    groups,
    selectedGroupIndex,
    selectedItemIndex,
    results,
    categoriesLoading,
    loadCategories,
    selectGroup,
    selectItem,
    runTest
  }
}
