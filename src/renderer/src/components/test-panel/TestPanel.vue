<!--
  @file TestPanel.vue - 规则测试面板
  @description 书源规则的测试验证组件，支持四种测试类型：
               1. 搜索测试 (search)：输入关键词测试搜索规则
               2. 发现测试 (discover)：测试发现页分类和列表规则
               3. 章节测试 (chapter)：输入书籍 URL 测试目录规则
               4. 正文测试 (content)：输入章节 URL 测试内容规则

               测试流程：
               - 搜索/发现 → 点击结果 → 自动跳转章节测试
               - 章节测试 → 点击结果 → 自动跳转正文测试

               特性：
               - 每种测试类型独立存储原始 HTML 和解析结果
               - 支持 JavaScript 规则执行
               - 漫画类型自动通过代理获取图片（绕过防盗链）
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { UniversalRule } from '../../types/universal'
import { UniversalContentType } from '../../types/universal'
import { useLogStore } from '../../stores/logStore'
import { useTestLogic } from './composables/useTestLogic'

// ==================== 输入组件 ====================
import SearchInput from './inputs/SearchInput.vue' // 搜索关键词输入
import DiscoverInput from './inputs/DiscoverInput.vue' // 发现分类选择
import ChapterInput from './inputs/ChapterInput.vue' // 章节 URL 输入
import ContentInput from './inputs/ContentInput.vue' // 正文 URL 输入

// ==================== 结果展示组件 ====================
import ResultTabs from './results/ResultTabs.vue' // 结果展示标签页

// ==================== Props 定义 ====================
/**
 * @property {UniversalRule} rule - 要测试的书源规则对象
 */
const props = defineProps<{
  rule: UniversalRule
}>()

// ==================== Store 实例 ====================
const logStore = useLogStore()

// ==================== 测试面板状态 ====================
/** 当前测试类型 */
const testType = ref<'search' | 'discover' | 'chapter' | 'content'>('search')
/** 是否正在执行测试 */
const testing = ref(false)

// ==================== 搜索测试状态 ====================
/** 搜索关键词 */
const searchKeyword = ref('')
/** 搜索结果列表 */
const searchResults = ref<{ name: string; url: string; author?: string }[]>([])
/** 搜索当前页码 */
const searchPage = ref(1)
/** 搜索是否支持分页（URL 包含 $page 变量） */
const searchHasPagination = computed(() => {
  const url = props.rule.search?.url || ''
  return url.includes('$page') || url.includes('{{page}}')
})

// ==================== 章节测试状态 ====================
/** 章节页 URL（书籍详情页或目录页） */
const chapterUrl = ref('')
/** 章节列表 */
const chapterResults = ref<{ name: string; url: string }[]>([])
/** 章节当前页码 */
const chapterPage = ref(1)
/** 章节是否支持分页（规则配置了 nextUrl） */
const chapterHasPagination = computed(() => !!props.rule.chapter?.nextUrl)

// ==================== 发现测试状态 ====================
/**
 * 分类组接口定义
 * @description 发现页的分类结构，支持分组显示
 */
interface CategoryGroup {
  /** 分组名称（如：类型、地区、状态） */
  name: string
  /** 该分组下的分类项 */
  items: { name: string; url: string }[]
}
/** 发现页分类分组列表 */
const discoverGroups = ref<CategoryGroup[]>([])
/** 当前选中的分组索引 */
const selectedGroupIndex = ref(0)
/** 当前选中的分类项索引 */
const selectedItemIndex = ref(0)
/** 发现结果列表 */
const discoverResults = ref<{ name: string; url: string; author?: string }[]>([])
/** 分类加载中状态 */
const categoriesLoading = ref(false)
/** 发现页当前页码 */
const discoverPage = ref(1)
/** 发现页下一页 URL（从页面中提取） */
const discoverNextUrl = ref('')
/** 发现页 URL 是否包含 $page 变量 */
const discoverUrlHasPage = computed(() => {
  const url = props.rule.discover?.url || ''
  return url.includes('$page') || url.includes('{{page}}')
})
/** 发现页是否有下一页（基于 URL 中的 $page 变量、nextUrl 规则配置或提取到的链接） */
const discoverHasNextPage = computed(
  () => discoverUrlHasPage.value || !!props.rule.discover?.nextUrl || !!discoverNextUrl.value
)

// ==================== 正文测试状态 ====================
/** 正文 URL（章节 URL） */
const contentUrl = ref('')
/** 正文内容数据（文字段落数组或图片 URL 数组） */
const contentData = ref<string[]>([])
/** 正文当前页码 */
const contentPage = ref(1)
/** 正文是否支持分页（规则配置了 nextUrl） */
const contentHasPagination = computed(() => !!props.rule.content?.nextUrl)

// ==================== 结果展示数据（按测试类型独立存储） ====================
// 每种测试类型独立存储 rawHtml 和 parsedResult，切换标签时不会丢失数据

/** 搜索测试的原始 HTML */
const searchRawHtml = ref('')
/** 搜索测试的解析结果 */
const searchParsedResult = ref<unknown[]>([])

/** 发现测试的原始 HTML */
const discoverRawHtml = ref('')
/** 发现测试的解析结果 */
const discoverParsedResult = ref<unknown[]>([])

/** 章节测试的原始 HTML */
const chapterRawHtml = ref('')
/** 章节测试的解析结果 */
const chapterParsedResult = ref<unknown[]>([])

/** 正文测试的原始 HTML */
const contentRawHtml = ref('')
/** 正文测试的解析结果 */
const contentParsedResult = ref<unknown[]>([])

// ==================== 计算属性 ====================

/**
 * 判断当前规则是否为漫画类型
 * @description 漫画类型的正文内容是图片，需要特殊处理（代理绕过防盗链）
 */
const isMangaContent = computed(() => props.rule.contentType === UniversalContentType.MANGA)

/**
 * 获取当前测试类型对应的原始 HTML
 * @description 用于 ResultTabs 组件显示原始响应数据
 */
const currentRawHtml = computed(() => {
  switch (testType.value) {
    case 'search':
      return searchRawHtml.value
    case 'discover':
      return discoverRawHtml.value
    case 'chapter':
      return chapterRawHtml.value
    case 'content':
      return contentRawHtml.value
    default:
      return ''
  }
})

/**
 * 获取当前测试类型对应的解析结果
 * @description 用于 ResultTabs 组件显示结构化解析数据
 */
const currentParsedResult = computed(() => {
  switch (testType.value) {
    case 'search':
      return searchParsedResult.value
    case 'discover':
      return discoverParsedResult.value
    case 'chapter':
      return chapterParsedResult.value
    case 'content':
      return contentParsedResult.value
    default:
      return []
  }
})

/**
 * 获取当前测试类型对应的可视化数据
 * @description 用于 ResultTabs 组件显示可视化内容
 */
const currentVisualData = computed(() => {
  switch (testType.value) {
    case 'search':
      return searchResults.value
    case 'discover':
      return discoverResults.value
    case 'chapter':
      return chapterResults.value
    case 'content':
      return contentData.value
    default:
      return []
  }
})

/**
 * 判断当前测试类型是否有结果
 * @description 控制是否显示结果展示区域
 */
const hasResults = computed(() => {
  switch (testType.value) {
    case 'search':
      return searchResults.value.length > 0 || searchRawHtml.value !== ''
    case 'discover':
      return discoverResults.value.length > 0 || discoverRawHtml.value !== ''
    case 'chapter':
      return chapterResults.value.length > 0 || chapterRawHtml.value !== ''
    case 'content':
      return contentData.value.length > 0 || contentRawHtml.value !== ''
    default:
      return false
  }
})

// ==================== Watch 监听器 ====================

/**
 * 监听书源 ID 变化，切换书源时清空所有测试数据
 */
watch(
  () => props.rule.id,
  () => {
    clearAllData()
    logStore.debug('切换书源，已清空预览数据')
  }
)

// ==================== 测试逻辑 Composable ====================
/**
 * 使用测试逻辑 Composable
 * @description 提供 URL 构建、HTML 获取、内容解析等通用功能
 */
const { buildFullUrl, fetchHtml, parseContent } = useTestLogic(props.rule)

// ==================== 数据清理函数 ====================

/**
 * 清空所有测试数据
 * @description 重置所有测试类型的输入和结果，用于切换书源时
 * @returns {void}
 */
function clearAllData(): void {
  // 清空搜索相关
  searchKeyword.value = ''
  searchResults.value = []
  searchRawHtml.value = ''
  searchParsedResult.value = []

  // 清空发现相关
  discoverGroups.value = []
  selectedGroupIndex.value = 0
  selectedItemIndex.value = 0
  discoverResults.value = []
  discoverRawHtml.value = ''
  discoverParsedResult.value = []
  discoverNextUrl.value = ''

  // 清空章节相关
  chapterUrl.value = ''
  chapterResults.value = []
  chapterRawHtml.value = ''
  chapterParsedResult.value = []

  // 清空正文相关
  contentUrl.value = ''
  contentData.value = []
  contentRawHtml.value = ''
  contentParsedResult.value = []
}

// ==================== 测试执行函数 ====================

/**
 * 执行测试（入口函数）
 * @description 根据当前测试类型分发到对应的测试函数
 * @returns {Promise<void>}
 */
async function runTest(): Promise<void> {
  logStore.info(
    `[Test] runTest 被调用, testType=${testType.value}, host=${props.rule.host || '(空)'}`
  )

  // 前置检查：必须配置 host
  if (!props.rule.host) {
    logStore.error('请先配置书源 host')
    return
  }

  testing.value = true
  try {
    switch (testType.value) {
      case 'search':
        await runSearchTest()
        break
      case 'discover':
        await runDiscoverTest()
        break
      case 'chapter':
        await runChapterTest()
        break
      case 'content':
        await runContentTest()
        break
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`测试失败: ${message}`)
  } finally {
    testing.value = false
  }
}

/**
 * 执行搜索测试
 * @description 测试搜索规则，支持分页控制：
 *              1. 替换关键词和页码变量
 *              2. 请求页面并解析列表
 *              3. 提取名称、封面、作者、链接等信息
 * @param page 可选的页码参数，不传则使用 searchPage.value
 * @returns {Promise<void>}
 */
async function runSearchTest(page?: number): Promise<void> {
  // 验证输入和配置
  if (!searchKeyword.value || !props.rule.search?.url) {
    logStore.error('请输入搜索关键词并配置搜索URL')
    return
  }

  // 使用参数页码或当前页码状态
  const currentPage = page ?? searchPage.value

  // 构建搜索 URL：替换关键词和页码变量
  const searchUrl = props.rule.search.url
    .replace(/\$keyword|\{\{keyword\}\}/g, encodeURIComponent(searchKeyword.value))
    .replace(/\$page|\{\{page\}\}/g, String(currentPage))

  const fullUrl = buildFullUrl(searchUrl, props.rule.host)
  logStore.info(`[搜索] 请求 URL: ${fullUrl} (第 ${currentPage} 页)`)

  // 执行解析：提取列表数据
  const result = await parseContent(fullUrl, props.rule.search.list || '', {
    name: props.rule.search.name || '@text',
    cover: props.rule.search.cover || '',
    author: props.rule.search.author || '',
    description: props.rule.search.description || '',
    latestChapter: props.rule.search.latestChapter || '',
    tags: props.rule.search.tags || '',
    url: props.rule.search.result || 'a@href'
  })

  // 保存结果
  searchResults.value = result.data as typeof searchResults.value
  searchParsedResult.value = result.data
  // 如果传入了页码参数，更新状态
  if (page !== undefined) {
    searchPage.value = page
  }
  logStore.info(`找到 ${result.data.length} 个搜索结果 (第 ${currentPage} 页)`)
  if (result.data.length > 0) {
    logStore.debug(`[示例] ${JSON.stringify(result.data[0])}`)
  }
}

/**
 * 执行发现测试
 * @description 测试发现/分类规则，支持分页控制：
 *              1. 如果分类未加载，先加载分类列表
 *              2. 根据选中的分类获取列表数据
 *              3. 支持 $page/{{page}} 变量替换当前页码
 * @param page 可选的页码参数，不传则使用 discoverPage.value
 * @returns {Promise<void>}
 */
async function runDiscoverTest(page?: number, nextPageUrl?: string): Promise<void> {
  // 验证配置
  if (!props.rule.discover?.url) {
    logStore.error('请配置发现URL')
    return
  }

  // 如果分类未加载，先加载分类
  if (discoverGroups.value.length === 0) {
    await loadDiscoverCategories()
    return
  }

  // 获取当前选中的分类
  const currentGroup = discoverGroups.value[selectedGroupIndex.value]
  if (!currentGroup || currentGroup.items.length === 0) {
    logStore.error('请选择一个分类')
    return
  }

  // 确保索引有效
  const safeItemIndex = Math.min(selectedItemIndex.value, currentGroup.items.length - 1)
  // 使用参数页码或当前页码状态
  const currentPage = page ?? discoverPage.value

  let fullUrl: string

  // 如果传入了 nextPageUrl，直接使用它
  if (nextPageUrl) {
    fullUrl = buildFullUrl(nextPageUrl, props.rule.host)
    logStore.info(`[发现] 请求 URL: ${fullUrl} (第 ${currentPage} 页，使用 nextUrl)`)
  } else {
    // 否则使用分类 URL 并替换页码变量
    let discoverUrl = currentGroup.items[safeItemIndex].url
    discoverUrl = discoverUrl.replace(/\$page|\{\{page\}\}/g, String(currentPage))
    fullUrl = buildFullUrl(discoverUrl, props.rule.host)
    logStore.info(`[发现] 请求 URL: ${fullUrl} (第 ${currentPage} 页)`)
  }

  // 执行解析，同时提取 nextUrl
  const result = await parseContent(
    fullUrl,
    props.rule.discover.list || '',
    {
      name: props.rule.discover.name || '@text',
      cover: props.rule.discover.cover || '',
      author: props.rule.discover.author || '',
      description: props.rule.discover.description || '',
      latestChapter: props.rule.discover.latestChapter || '',
      tags: props.rule.discover.tags || '',
      url: props.rule.discover.result || 'a@href'
    },
    props.rule.discover.nextUrl // 传入 nextUrl 规则
  )

  // 保存结果
  discoverResults.value = result.data as typeof discoverResults.value
  discoverParsedResult.value = result.data
  // 保存下一页 URL
  discoverNextUrl.value = result.nextUrl || ''
  if (result.nextUrl) {
    logStore.debug(`[发现] 提取到下一页链接: ${result.nextUrl}`)
  }
  // 如果传入了页码参数，更新状态
  if (page !== undefined) {
    discoverPage.value = page
  }
  logStore.info(`[发现] 找到 ${result.data.length} 个结果 (第 ${currentPage} 页)`)
  if (result.data.length > 0) {
    logStore.debug(`[示例] ${JSON.stringify(result.data[0])}`)
  }
}

/**
 * 加载发现页分类列表
 * @description 解析发现 URL 配置，支持两种格式：
 *              1. 静态配置：多行文本，每行一个分类
 *              2. 动态配置：@js: 前缀的 JavaScript 代码
 *
 *              分类格式：
 *              - 简单格式：分类名::URL
 *              - 分组格式：分组名::分类名::URL
 *              - 单值格式：URL（名称=URL）
 * @returns {Promise<void>}
 */
async function loadDiscoverCategories(): Promise<void> {
  if (!props.rule.discover?.url) return

  categoriesLoading.value = true
  const discoverUrlRaw = props.rule.discover.url.trim()

  try {
    let rawList: string[] = []

    // 检测是否为 JavaScript 规则
    if (discoverUrlRaw.startsWith('@js:')) {
      logStore.debug('检测到 @js: 规则，执行 JavaScript 获取分类列表...')
      const jsCode = discoverUrlRaw.slice(4).trim()
      const jsResult = await window.api.executeJs('about:blank', jsCode, props.rule.userAgent)

      if (!jsResult.success) {
        throw new Error(jsResult.error || 'JavaScript 执行失败')
      }

      // 处理 JS 返回结果
      if (Array.isArray(jsResult.data)) {
        rawList = jsResult.data.map(String)
      } else if (typeof jsResult.data === 'string') {
        rawList = jsResult.data.split('\n').filter((s: string) => s.trim())
      }
    } else {
      // 静态配置：按行分割
      rawList = discoverUrlRaw.split('\n').filter((line) => line.trim())
    }

    // 解析分类列表，按分组组织
    const groupMap = new Map<string, { name: string; url: string }[]>()

    for (const item of rawList) {
      const parts = item.split('::').map((s) => s.trim())
      if (parts.length === 2) {
        // 两段式规则：分类名::URL，每个分类独立成组（与 any-reader 一致）
        const [name, url] = parts
        groupMap.set(name, [{ name, url }])
      } else if (parts.length >= 3) {
        // 三段式规则：分组名::分类名::URL
        const groupName = parts[0]
        const itemName = parts[1]
        const url = parts.slice(2).join('::') // URL 中可能包含 ::
        if (!groupMap.has(groupName)) groupMap.set(groupName, [])
        groupMap.get(groupName)!.push({ name: itemName, url })
      }
      // 忽略无效的单段式规则
    }

    // 转换为数组格式
    const groups: CategoryGroup[] = Array.from(groupMap, ([name, items]) => ({ name, items }))
    discoverGroups.value = groups
    selectedGroupIndex.value = 0
    selectedItemIndex.value = 0
    logStore.info(`加载了 ${groups.length} 个分组，共 ${rawList.length} 个分类`)

    // 分类加载完成后自动执行发现测试
    if (groups.length > 0) {
      await runDiscoverTest()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`加载分类失败: ${message}`)
  } finally {
    categoriesLoading.value = false
  }
}

/**
 * 选择分组
 * @description 切换发现页分组，重置分类选择并执行测试
 * @param {number} gIdx - 分组索引
 * @returns {Promise<void>}
 */
async function selectGroup(gIdx: number): Promise<void> {
  selectedGroupIndex.value = gIdx
  selectedItemIndex.value = 0
  // 切换分组时重置页码和下一页链接
  discoverPage.value = 1
  discoverNextUrl.value = ''
  await runDiscoverTest()
}

/**
 * 选择分类项
 * @description 切换发现页分类项并执行测试
 * @param {number} iIdx - 分类项索引
 * @returns {Promise<void>}
 */
async function selectItem(iIdx: number): Promise<void> {
  selectedItemIndex.value = iIdx
  // 切换分类时重置页码和下一页链接
  discoverPage.value = 1
  discoverNextUrl.value = ''
  await runDiscoverTest()
}

/**
 * 发现页上一页
 */
async function goDiscoverPrevPage(): Promise<void> {
  if (discoverPage.value > 1) {
    await runDiscoverTest(discoverPage.value - 1)
  }
}

/**
 * 发现页下一页
 */
async function goDiscoverNextPage(): Promise<void> {
  // 优先使用提取到的 nextUrl
  if (discoverNextUrl.value) {
    await runDiscoverTest(discoverPage.value + 1, discoverNextUrl.value)
  } else {
    // 否则使用页码变量替换
    await runDiscoverTest(discoverPage.value + 1)
  }
}

/**
 * 搜索上一页
 */
async function goSearchPrevPage(): Promise<void> {
  if (searchPage.value > 1) {
    await runSearchTest(searchPage.value - 1)
  }
}

/**
 * 搜索下一页
 */
async function goSearchNextPage(): Promise<void> {
  await runSearchTest(searchPage.value + 1)
}

/**
 * 章节上一页
 */
async function goChapterPrevPage(): Promise<void> {
  if (chapterPage.value > 1) {
    await runChapterTest(chapterPage.value - 1)
  }
}

/**
 * 章节下一页
 */
async function goChapterNextPage(): Promise<void> {
  await runChapterTest(chapterPage.value + 1)
}

/**
 * 正文上一页
 */
async function goContentPrevPage(): Promise<void> {
  if (contentPage.value > 1) {
    await runContentTest(contentPage.value - 1)
  }
}

/**
 * 正文下一页
 */
async function goContentNextPage(): Promise<void> {
  await runContentTest(contentPage.value + 1)
}

/**
 * 执行章节测试
 * @description 测试章节/目录规则，支持分页：
 *              1. 支持 chapter.url 模板，替换 $result/{{result}} 变量
 *              2. 支持 $page/{{page}} 变量进行分页
 *              3. 解析章节列表，提取名称和链接
 * @param page 可选的页码参数，不传则使用 chapterPage.value
 * @returns {Promise<void>}
 */
async function runChapterTest(page?: number): Promise<void> {
  // 验证输入
  if (!chapterUrl.value) {
    logStore.error('请输入章节页URL')
    return
  }

  // 使用参数页码或当前页码状态
  const currentPage = page ?? chapterPage.value

  // 构建最终 URL：支持 chapter.url 模板
  logStore.debug(`[章节] 输入值: ${chapterUrl.value}`)
  logStore.debug(`[章节] 章节 URL 模板: ${props.rule.chapter?.url || '(未设置)'}`)

  let chapterUrlFinal = props.rule.chapter?.url
    ? props.rule.chapter.url.replace(/\$result|\{\{result\}\}/g, chapterUrl.value)
    : chapterUrl.value

  // 替换页码变量
  chapterUrlFinal = chapterUrlFinal.replace(/\$page|\{\{page\}\}/g, String(currentPage))

  const fullUrl = buildFullUrl(chapterUrlFinal, props.rule.host)
  logStore.info(`[章节] 请求 URL: ${fullUrl} (第 ${currentPage} 页)`)

  // 执行解析，同时提取 nextUrl
  const result = await parseContent(
    fullUrl,
    props.rule.chapter?.list || '',
    {
      name: props.rule.chapter?.name || '@text',
      cover: props.rule.chapter?.cover || '',
      time: props.rule.chapter?.time || '',
      url: props.rule.chapter?.result || 'a@href'
    },
    props.rule.chapter?.nextUrl // 传入 nextUrl 规则
  )

  // 保存结果
  chapterResults.value = result.data as typeof chapterResults.value
  chapterParsedResult.value = result.data
  // 如果传入了页码参数，更新状态
  if (page !== undefined) {
    chapterPage.value = page
  }
  logStore.info(`找到 ${result.data.length} 个章节 (第 ${currentPage} 页)`)
}

/**
 * 执行正文测试
 * @description 测试正文内容规则，支持两种规则类型和分页：
 *              1. CSS/XPath 选择器规则：使用 Cheerio 解析
 *              2. JavaScript 规则：使用 Puppeteer 执行
 *              3. 支持 $page/{{page}} 变量进行分页
 *
 *              漫画类型特殊处理：
 *              - 自动识别图片 URL 数组
 *              - 通过代理获取图片（绕过防盗链）
 * @param page 可选的页码参数，不传则使用 contentPage.value
 * @returns {Promise<void>}
 */
async function runContentTest(page?: number): Promise<void> {
  // 验证输入
  if (!contentUrl.value) {
    logStore.error('请输入正文 URL')
    return
  }

  // 使用参数页码或当前页码状态
  const currentPage = page ?? contentPage.value

  // 构建最终 URL：支持 content.url 模板
  let contentUrlFinal = props.rule.content?.url
    ? props.rule.content.url.replace(/\$result|\{\{result\}\}/g, contentUrl.value)
    : contentUrl.value

  // 替换页码变量
  contentUrlFinal = contentUrlFinal.replace(/\$page|\{\{page\}\}/g, String(currentPage))

  const fullUrl = buildFullUrl(contentUrlFinal, props.rule.host)
  logStore.info(`[正文] 请求 URL: ${fullUrl} (第 ${currentPage} 页)`)

  const contentRule = props.rule.content?.items || ''

  // 检测是否为 JavaScript 规则（通过特征关键词判断）
  const isJsRule =
    /function\s+\w+\s*\(|var\s+\w+\s*=|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*{|\.match\(|\.replace\(/.test(
      contentRule
    )

  if (isJsRule) {
    // JavaScript 规则：使用 Puppeteer 执行
    logStore.debug('检测到 JavaScript 规则，使用 executeJs')
    const jsResult = await window.api.executeJs(fullUrl, contentRule, props.rule.userAgent)

    if (!jsResult.success) {
      throw new Error(jsResult.error || 'JavaScript 执行失败')
    }

    let imageUrls: string[] = []

    // 处理 JS 返回结果，支持多种格式
    if (Array.isArray(jsResult.data)) {
      if (
        jsResult.data.length > 0 &&
        typeof jsResult.data[0] === 'object' &&
        jsResult.data[0] !== null &&
        'url' in jsResult.data[0]
      ) {
        // 格式：[{ url: '...' }, ...]
        imageUrls = jsResult.data.map((item: unknown) =>
          String((item as { url?: string }).url || '')
        )
      } else {
        // 格式：['...', '...']
        contentData.value = jsResult.data.map(String)
      }
    } else if (typeof jsResult.data === 'string') {
      try {
        // 尝试解析 JSON 字符串
        const parsed = JSON.parse(jsResult.data)
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.url) {
          imageUrls = parsed.map((item: { url?: string }) => String(item.url || ''))
        } else {
          contentData.value = [jsResult.data]
        }
      } catch {
        // 非 JSON 字符串，直接作为内容
        contentData.value = [jsResult.data]
      }
    } else {
      // 其他类型，序列化为 JSON
      contentData.value = [JSON.stringify(jsResult.data, null, 2)]
    }

    // 漫画类型：通过代理获取图片（绕过防盗链）
    if (isMangaContent.value && imageUrls.length > 0) {
      logStore.debug(`通过代理获取 ${imageUrls.length} 张图片...`)
      const proxyResults = await Promise.all(
        imageUrls.map((url) => window.api.proxyImage(url, props.rule.host))
      )
      // 代理成功返回 dataUrl，失败返回原始 URL
      contentData.value = proxyResults.map((result, index) =>
        result.success ? result.dataUrl! : imageUrls[index]
      )
    } else if (imageUrls.length > 0) {
      contentData.value = imageUrls
    }

    contentParsedResult.value = contentData.value
    logStore.info(`获取到 ${contentData.value.length} 段内容`)
  } else {
    // CSS/XPath 规则：使用 Cheerio 解析
    const html = await fetchHtml(fullUrl)
    contentRawHtml.value = html
    const parseResult = await window.api.parse(html, { contentRule })

    if (!parseResult.success) {
      throw new Error(parseResult.error || '解析失败')
    }

    contentData.value = parseResult.data || []
    contentParsedResult.value = contentData.value
    logStore.info(`获取到 ${contentData.value.length} 段内容 (第 ${currentPage} 页)`)
  }

  // 如果传入了页码参数，更新状态
  if (page !== undefined) {
    contentPage.value = page
  }
}

// ==================== 结果交互函数 ====================

/**
 * 处理结果项点击
 * @description 点击搜索/发现结果时自动跳转到章节测试，
 *              点击章节结果时自动跳转到正文测试
 * @param {{ name: string; url: string }} item - 被点击的结果项
 * @returns {void}
 */
function selectResult(item: { name: string; url: string }): void {
  if (testType.value === 'search' || testType.value === 'discover') {
    // 搜索/发现结果 → 跳转章节测试
    chapterUrl.value = item.url
    testType.value = 'chapter'
    logStore.info(`选择: ${item.name}`)
  } else if (testType.value === 'chapter') {
    // 章节结果 → 跳转正文测试
    contentUrl.value = item.url
    testType.value = 'content'
    logStore.info(`选择章节: ${item.name}`)
  }
}
</script>

<template>
  <div class="test-panel-container">
    <!-- Header -->
    <div class="test-header">
      <a-radio-group v-model="testType" type="button" size="small">
        <a-radio value="search">搜索</a-radio>
        <a-radio value="discover">发现</a-radio>
        <a-radio value="chapter">章节</a-radio>
        <a-radio value="content">正文</a-radio>
      </a-radio-group>
    </div>

    <!-- Content -->
    <div class="test-content">
      <!-- Loading overlay -->
      <div v-if="testing" class="loading-overlay"><a-spin size="large" tip="测试中..." /></div>

      <!-- Input area -->
      <div class="test-input">
        <SearchInput
          v-if="testType === 'search'"
          v-model:keyword="searchKeyword"
          :loading="testing"
          :page="searchPage"
          :has-pagination="searchHasPagination"
          @prev-page="goSearchPrevPage"
          @next-page="goSearchNextPage"
          @test="runTest"
        />
        <DiscoverInput
          v-else-if="testType === 'discover'"
          :groups="discoverGroups"
          :selected-group-index="selectedGroupIndex"
          :selected-item-index="selectedItemIndex"
          :loading="testing"
          :categories-loading="categoriesLoading"
          :page="discoverPage"
          :has-pagination="discoverHasNextPage"
          @select-group="selectGroup"
          @select-item="selectItem"
          @prev-page="goDiscoverPrevPage"
          @next-page="goDiscoverNextPage"
          @test="runTest"
        />
        <ChapterInput
          v-else-if="testType === 'chapter'"
          v-model:url="chapterUrl"
          :loading="testing"
          :page="chapterPage"
          :has-pagination="chapterHasPagination"
          @prev-page="goChapterPrevPage"
          @next-page="goChapterNextPage"
          @test="runTest"
        />
        <ContentInput
          v-else
          v-model:url="contentUrl"
          :loading="testing"
          :page="contentPage"
          :has-pagination="contentHasPagination"
          @prev-page="goContentPrevPage"
          @next-page="goContentNextPage"
          @test="runTest"
        />
      </div>

      <!-- Results -->
      <ResultTabs
        v-if="hasResults"
        :type="testType"
        :visual-data="currentVisualData"
        :parsed-result="currentParsedResult"
        :raw-html="currentRawHtml"
        :is-manga="isMangaContent"
        @select="selectResult"
      />

      <!-- Empty state -->
      <div v-if="!testing && !hasResults" class="empty-state">
        <div class="empty-state-icon">
          <icon-experiment />
        </div>
        <div class="empty-state-text">输入测试参数后点击测试按钮</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-1);
}

.test-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.test-content {
  position: relative;
  flex: 1;
  min-height: 0; /* 关键：让 flex 子元素可以收缩 */
  overflow: hidden; /* 不在这层滚动，让子组件自己控制 */
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--color-bg-1), 0.8);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.test-input {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  flex: 1;
}

.empty-state-icon {
  font-size: 48px;
  color: var(--color-text-4);
  margin-bottom: 16px;
}

.empty-state-text {
  color: var(--color-text-3);
  font-size: 14px;
}

@media (max-width: 400px) {
  .test-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
}

.test-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.test-content::-webkit-scrollbar-thumb {
  background: var(--color-fill-3);
  border-radius: 3px;
}

.test-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-fill-4);
}
</style>
