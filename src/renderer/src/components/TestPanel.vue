<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Rule } from '../types'
import { ContentType } from '../types'
import { useLogStore } from '../stores/logStore'

const props = defineProps<{
  rule: Rule
}>()

const logStore = useLogStore()

const testType = ref<'search' | 'discover' | 'chapter' | 'content'>('search')
const testing = ref(false)

// 搜索 Tab 独立状态
const searchKeyword = ref('')
const searchResults = ref<{ name: string; url: string; author?: string }[]>([])

// 章节 Tab 独立状态
const chapterUrl = ref('')
const chapterResults = ref<{ name: string; url: string }[]>([])

// 发现 Tab 独立状态 - 支持分组分类
interface CategoryGroup {
  name: string
  items: { name: string; url: string }[]
}
const discoverGroups = ref<CategoryGroup[]>([])
const selectedGroupIndex = ref(0)
const selectedItemIndex = ref(0)
const discoverResults = ref<{ name: string; url: string; author?: string }[]>([])
const categoriesLoading = ref(false)

// 正文 Tab 独立状态
const contentUrl = ref('')
const contentData = ref<string[]>([])

// 检测是否为漫画类型（需要显示图片）
const isMangaContent = computed(() => props.rule.contentType === ContentType.MANGA)

// 监听 rule 变化，清空所有预览数据
watch(
  () => props.rule.id,
  () => {
    searchKeyword.value = ''
    searchResults.value = []
    discoverGroups.value = []
    selectedGroupIndex.value = 0
    selectedItemIndex.value = 0
    discoverResults.value = []
    chapterUrl.value = ''
    chapterResults.value = []
    contentUrl.value = ''
    contentData.value = []
    logStore.debug('切换书源，已清空预览数据')
  }
)

async function runTest(): Promise<void> {
  if (!props.rule.host) {
    logStore.error('请先配置书源 host')
    return
  }

  testing.value = true

  try {
    if (testType.value === 'search') {
      await runSearchTest()
    } else if (testType.value === 'discover') {
      await runDiscoverTest()
    } else if (testType.value === 'chapter') {
      await runChapterTest()
    } else if (testType.value === 'content') {
      await runContentTest()
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`测试失败: ${message}`)
  } finally {
    testing.value = false
  }
}

async function runSearchTest(): Promise<void> {
  if (!searchKeyword.value || !props.rule.searchUrl) {
    logStore.error('请输入搜索关键词并配置搜索URL')
    return
  }

  const searchUrl = props.rule.searchUrl
    .replace(/\$keyword|\{\{keyword\}\}/g, encodeURIComponent(searchKeyword.value))
    .replace(/\$page|\{\{page\}\}/g, '1')

  const fullUrl = buildFullUrl(searchUrl, props.rule.host)
  logStore.debug(`请求 URL: ${fullUrl}`)

  const proxyResult = await window.api.proxy(fullUrl, props.rule.userAgent)
  if (!proxyResult.success) {
    throw new Error(proxyResult.error || '代理请求失败')
  }

  logStore.debug(`获取到 HTML，长度: ${proxyResult.html?.length}`)

  const parseResult = await window.api.parse(proxyResult.html!, {
    listRule: props.rule.searchList,
    fields: {
      name: props.rule.searchName || '@text',
      cover: props.rule.searchCover,
      author: props.rule.searchAuthor,
      url: props.rule.searchResult || 'a@href'
    },
    host: props.rule.host
  })

  if (parseResult.success) {
    searchResults.value = parseResult.data || []
    logStore.info(`找到 ${searchResults.value.length} 个结果`)
  } else {
    throw new Error(parseResult.error || '解析失败')
  }
}

async function runDiscoverTest(): Promise<void> {
  if (!props.rule.discoverUrl) {
    logStore.error('请配置发现URL')
    return
  }

  // 如果没有分类，先加载分类列表
  if (discoverGroups.value.length === 0) {
    await loadDiscoverCategories()
    return
  }

  // 获取当前选中的 URL
  const currentGroup = discoverGroups.value[selectedGroupIndex.value]
  if (!currentGroup || currentGroup.items.length === 0) {
    logStore.error('请选择一个分类')
    return
  }

  const safeItemIndex = Math.min(selectedItemIndex.value, currentGroup.items.length - 1)
  let discoverUrl = currentGroup.items[safeItemIndex].url

  // 替换页码变量
  discoverUrl = discoverUrl.replace(/\$page|\{\{page\}\}/g, '1')

  const fullUrl = buildFullUrl(discoverUrl, props.rule.host)
  logStore.debug(`请求 URL: ${fullUrl}`)

  const proxyResult = await window.api.proxy(fullUrl, props.rule.userAgent)
  if (!proxyResult.success) {
    throw new Error(proxyResult.error || '代理请求失败')
  }

  logStore.debug(`获取到 HTML，长度: ${proxyResult.html?.length}`)

  const parseResult = await window.api.parse(proxyResult.html!, {
    listRule: props.rule.discoverList,
    fields: {
      name: props.rule.discoverName || '@text',
      cover: props.rule.discoverCover,
      author: props.rule.discoverAuthor,
      url: props.rule.discoverResult || 'a@href'
    },
    host: props.rule.host
  })

  if (parseResult.success) {
    discoverResults.value = parseResult.data || []
    logStore.info(`发现 ${discoverResults.value.length} 个结果`)
  } else {
    throw new Error(parseResult.error || '解析失败')
  }
}

async function loadDiscoverCategories(): Promise<void> {
  if (!props.rule.discoverUrl) return

  categoriesLoading.value = true
  const discoverUrlRaw = props.rule.discoverUrl.trim()

  try {
    let rawList: string[] = []

    // 检查是否为 @js: 规则
    if (discoverUrlRaw.startsWith('@js:')) {
      logStore.debug('检测到 @js: 规则，执行 JavaScript 获取分类列表...')

      const jsCode = discoverUrlRaw.slice(4).trim()
      const jsResult = await window.api.executeJs('about:blank', jsCode, props.rule.userAgent)

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

    // 解析分类列表为分组结构
    // 格式: "全部::URL" 或 "分组名::子分类名::URL"
    const groupMap = new Map<string, { name: string; url: string }[]>()

    for (const item of rawList) {
      const parts = item.split('::').map((s) => s.trim())
      if (parts.length === 2) {
        // 单层分类: "分类名::URL"
        if (!groupMap.has('全部')) {
          groupMap.set('全部', [])
        }
        groupMap.get('全部')!.push({ name: parts[0], url: parts[1] })
      } else if (parts.length >= 3) {
        // 多层分类: "分组名::子分类名::URL"
        const groupName = parts[0]
        const itemName = parts[1]
        const url = parts.slice(2).join('::') // URL 可能包含 ::
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, [])
        }
        groupMap.get(groupName)!.push({ name: itemName, url })
      } else {
        // 无分隔符，作为 URL 直接使用
        if (!groupMap.has('全部')) {
          groupMap.set('全部', [])
        }
        groupMap.get('全部')!.push({ name: item, url: item })
      }
    }

    // 转换为数组
    const groups: CategoryGroup[] = []
    for (const [name, items] of groupMap) {
      groups.push({ name, items })
    }

    discoverGroups.value = groups
    selectedGroupIndex.value = 0
    selectedItemIndex.value = 0
    logStore.info(`加载了 ${groups.length} 个分组，共 ${rawList.length} 个分类`)

    // 加载完分类后自动加载第一个分类的数据
    if (groups.length > 0) {
      await fetchDiscoverData()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`加载分类失败: ${message}`)
  } finally {
    categoriesLoading.value = false
  }
}

// 选择分组
async function selectGroup(gIdx: number): Promise<void> {
  selectedGroupIndex.value = gIdx
  selectedItemIndex.value = 0
  await fetchDiscoverData()
}

// 选择子分类
async function selectItem(iIdx: number): Promise<void> {
  selectedItemIndex.value = iIdx
  await fetchDiscoverData()
}

// 获取发现数据
async function fetchDiscoverData(): Promise<void> {
  const currentGroup = discoverGroups.value[selectedGroupIndex.value]
  if (!currentGroup || currentGroup.items.length === 0) return

  const safeItemIndex = Math.min(selectedItemIndex.value, currentGroup.items.length - 1)
  let discoverUrl = currentGroup.items[safeItemIndex].url

  // 替换页码变量
  discoverUrl = discoverUrl.replace(/\$page|\{\{page\}\}/g, '1')

  const fullUrl = buildFullUrl(discoverUrl, props.rule.host)
  logStore.debug(`请求 URL: ${fullUrl}`)

  testing.value = true
  try {
    const proxyResult = await window.api.proxy(fullUrl, props.rule.userAgent)
    if (!proxyResult.success) {
      throw new Error(proxyResult.error || '代理请求失败')
    }

    const parseResult = await window.api.parse(proxyResult.html!, {
      listRule: props.rule.discoverList,
      fields: {
        name: props.rule.discoverName || '@text',
        cover: props.rule.discoverCover,
        author: props.rule.discoverAuthor,
        url: props.rule.discoverResult || 'a@href'
      },
      host: props.rule.host
    })

    if (parseResult.success) {
      discoverResults.value = parseResult.data || []
      logStore.info(`发现 ${discoverResults.value.length} 个结果`)
    } else {
      throw new Error(parseResult.error || '解析失败')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`加载失败: ${message}`)
  } finally {
    testing.value = false
  }
}

async function runChapterTest(): Promise<void> {
  if (!chapterUrl.value) {
    logStore.error('请输入章节页 URL')
    return
  }

  const chapterUrlFinal = props.rule.chapterUrl
    ? props.rule.chapterUrl.replace(/\$result|\{\{result\}\}/g, chapterUrl.value)
    : chapterUrl.value

  const fullUrl = buildFullUrl(chapterUrlFinal, props.rule.host)
  logStore.debug(`请求 URL: ${fullUrl}`)

  const proxyResult = await window.api.proxy(fullUrl, props.rule.userAgent)
  if (!proxyResult.success) {
    throw new Error(proxyResult.error || '代理请求失败')
  }

  const parseResult = await window.api.parse(proxyResult.html!, {
    listRule: props.rule.chapterList,
    fields: {
      name: props.rule.chapterName || '@text',
      url: props.rule.chapterResult || 'a@href'
    },
    host: props.rule.host
  })

  if (parseResult.success) {
    chapterResults.value = parseResult.data || []
    logStore.info(`找到 ${chapterResults.value.length} 个章节`)
  } else {
    throw new Error(parseResult.error || '解析失败')
  }
}

async function runContentTest(): Promise<void> {
  if (!contentUrl.value) {
    logStore.error('请输入正文 URL')
    return
  }

  const contentUrlFinal = props.rule.contentUrl
    ? props.rule.contentUrl.replace(/\$result|\{\{result\}\}/g, contentUrl.value)
    : contentUrl.value

  const fullUrl = buildFullUrl(contentUrlFinal, props.rule.host)
  logStore.debug(`请求 URL: ${fullUrl}`)

  const contentRule = props.rule.contentItems || ''

  // 检测是否为 JavaScript 规则（包含函数定义、变量赋值等 JS 语法）
  const isJsRule =
    /function\s+\w+\s*\(|var\s+\w+\s*=|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*{|\.match\(|\.replace\(/.test(
      contentRule
    )

  if (isJsRule) {
    logStore.debug('检测到 JavaScript 规则，使用 executeJs')
    const jsResult = await window.api.executeJs(fullUrl, contentRule, props.rule.userAgent)

    if (jsResult.success) {
      // 处理返回结果
      let imageUrls: string[] = []

      if (Array.isArray(jsResult.data)) {
        // 检查是否为漫画数据格式 [{url: "..."}, ...]
        if (
          jsResult.data.length > 0 &&
          typeof jsResult.data[0] === 'object' &&
          jsResult.data[0] !== null
        ) {
          const firstItem = jsResult.data[0] as Record<string, unknown>
          if ('url' in firstItem) {
            // 漫画数据格式，提取 url 字段
            imageUrls = jsResult.data.map((item: unknown) => {
              const obj = item as Record<string, unknown>
              return String(obj.url || '')
            })
          } else {
            contentData.value = jsResult.data.map(String)
          }
        } else {
          contentData.value = jsResult.data.map(String)
        }
      } else if (typeof jsResult.data === 'string') {
        // 尝试解析 JSON 字符串
        try {
          const parsed = JSON.parse(jsResult.data)
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.url) {
            imageUrls = parsed.map((item: { url?: string }) => String(item.url || ''))
          } else {
            contentData.value = [jsResult.data]
          }
        } catch {
          contentData.value = [jsResult.data]
        }
      } else {
        contentData.value = [JSON.stringify(jsResult.data, null, 2)]
      }

      // 如果是漫画类型且有图片 URL，通过代理获取图片
      if (isMangaContent.value && imageUrls.length > 0) {
        logStore.debug(`通过代理获取 ${imageUrls.length} 张图片...`)
        const proxyResults = await Promise.all(
          imageUrls.map((url) => window.api.proxyImage(url, props.rule.host))
        )
        contentData.value = proxyResults.map((result, index) =>
          result.success ? result.dataUrl! : imageUrls[index]
        )
      } else if (imageUrls.length > 0) {
        contentData.value = imageUrls
      }

      logStore.info(`获取到 ${contentData.value.length} 段内容`)
    } else {
      throw new Error(jsResult.error || 'JavaScript 执行失败')
    }
  } else {
    // CSS 选择器规则
    const proxyResult = await window.api.proxy(fullUrl, props.rule.userAgent)
    if (!proxyResult.success) {
      throw new Error(proxyResult.error || '代理请求失败')
    }

    const parseResult = await window.api.parse(proxyResult.html!, {
      contentRule: contentRule
    })

    if (parseResult.success) {
      contentData.value = parseResult.data || []
      logStore.info(`获取到 ${contentData.value.length} 段内容`)
    } else {
      throw new Error(parseResult.error || '解析失败')
    }
  }
}

function buildFullUrl(url: string, host: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const baseHost = host.endsWith('/') ? host.slice(0, -1) : host
  const path = url.startsWith('/') ? url : '/' + url
  return baseHost + path
}

function selectResult(item: { name: string; url: string }): void {
  if (testType.value === 'search' || testType.value === 'discover') {
    // 从搜索/发现结果选择，设置章节页 URL
    chapterUrl.value = item.url
    testType.value = 'chapter'
    logStore.info(`选择: ${item.name}`)
  } else if (testType.value === 'chapter') {
    // 从章节结果选择，设置正文页 URL
    contentUrl.value = item.url
    testType.value = 'content'
    logStore.info(`选择章节: ${item.name}`)
  }
}
</script>

<template>
  <div class="test-panel-container">
    <div class="test-header">
      <a-radio-group v-model="testType" type="button" size="small">
        <a-radio value="search">搜索</a-radio>
        <a-radio value="discover">发现</a-radio>
        <a-radio value="chapter">章节</a-radio>
        <a-radio value="content">正文</a-radio>
      </a-radio-group>
    </div>

    <div class="test-content">
      <!-- 搜索输入 -->
      <div v-if="testType === 'search'" class="test-input">
        <a-input-search
          v-model="searchKeyword"
          placeholder="输入搜索关键词..."
          :loading="testing"
          @search="runTest"
        >
          <template #button-default>测试</template>
        </a-input-search>
        <!-- 搜索结果 -->
        <div v-if="searchResults.length > 0" class="result-list">
          <div
            v-for="(item, index) in searchResults"
            :key="index"
            class="result-item"
            @click="selectResult(item)"
          >
            <div class="result-info">
              <div class="result-name">{{ item.name }}</div>
              <div class="result-url">{{ item.author || item.url }}</div>
            </div>
            <icon-right class="result-arrow" />
          </div>
        </div>
      </div>

      <!-- 发现页 -->
      <div v-else-if="testType === 'discover'" class="test-input">
        <!-- 分组分类选择器 -->
        <div v-if="discoverGroups.length > 0" class="discover-category-panel">
          <!-- 第一行：分组标签 -->
          <div class="category-groups">
            <a-button
              v-for="(group, gIdx) in discoverGroups"
              :key="gIdx"
              :type="selectedGroupIndex === gIdx ? 'primary' : 'text'"
              size="small"
              @click="selectGroup(gIdx)"
            >
              {{ group.name }}
            </a-button>
          </div>
          <!-- 第二行：子分类标签 -->
          <div v-if="discoverGroups[selectedGroupIndex]?.items.length > 1" class="category-items">
            <a-button
              v-for="(item, iIdx) in discoverGroups[selectedGroupIndex].items"
              :key="iIdx"
              :type="selectedItemIndex === iIdx ? 'primary' : 'text'"
              size="small"
              @click="selectItem(iIdx)"
            >
              {{ item.name }}
            </a-button>
          </div>
        </div>
        <a-button
          type="primary"
          size="small"
          :loading="testing || categoriesLoading"
          @click="runTest"
          style="margin-top: 8px"
        >
          <icon-thunderbolt />
          {{ discoverGroups.length > 0 ? '刷新列表' : '加载分类' }}
        </a-button>
        <!-- 发现结果 -->
        <div v-if="discoverResults.length > 0" class="result-list">
          <div
            v-for="(item, index) in discoverResults"
            :key="index"
            class="result-item"
            @click="selectResult(item)"
          >
            <div class="result-info">
              <div class="result-name">{{ item.name }}</div>
              <div class="result-url">{{ item.author || item.url }}</div>
            </div>
            <icon-right class="result-arrow" />
          </div>
        </div>
      </div>

      <!-- 章节输入 -->
      <div v-else-if="testType === 'chapter'" class="test-input">
        <a-input v-model="chapterUrl" placeholder="章节页 URL" style="margin-bottom: 8px" />
        <a-button type="primary" size="small" :loading="testing" @click="runTest">
          <icon-thunderbolt /> 执行测试
        </a-button>
        <!-- 章节结果 -->
        <div v-if="chapterResults.length > 0" class="result-list">
          <div
            v-for="(item, index) in chapterResults"
            :key="index"
            class="result-item"
            @click="selectResult(item)"
          >
            <div class="result-info">
              <div class="result-name">{{ item.name }}</div>
              <div class="result-url">{{ item.url }}</div>
            </div>
            <icon-right class="result-arrow" />
          </div>
        </div>
      </div>

      <!-- 正文输入 -->
      <div v-else class="test-input">
        <a-input v-model="contentUrl" placeholder="正文页 URL" style="margin-bottom: 8px" />
        <a-button type="primary" size="small" :loading="testing" @click="runTest">
          <icon-thunderbolt /> 执行测试
        </a-button>
        <!-- 正文内容 -->
        <div v-if="contentData.length > 0" class="content-preview">
          <!-- 漫画模式显示图片 -->
          <template v-if="isMangaContent">
            <div class="manga-images">
              <template v-for="(imgUrl, index) in contentData" :key="index">
                <a-image
                  :src="imgUrl"
                  width="100%"
                  :alt="`第 ${index + 1} 页`"
                  class="manga-page"
                />
              </template>
            </div>
          </template>
          <!-- 小说模式显示文本 -->
          <template v-else>
            <p v-for="(para, index) in contentData" :key="index">{{ para }}</p>
          </template>
        </div>
      </div>

      <a-empty
        v-if="
          !testing &&
          searchResults.length === 0 &&
          discoverResults.length === 0 &&
          chapterResults.length === 0 &&
          contentData.length === 0
        "
        description="暂无结果"
      />
    </div>
  </div>
</template>

<style scoped>
.test-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.test-header {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.test-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.test-input {
  margin-bottom: 12px;
}

.discover-category-panel {
  background: var(--color-bg-3);
  border-radius: 8px;
  padding: 8px;
}

.category-groups,
.category-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-items {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-bg-3);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.result-item:hover {
  background: var(--color-border);
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-url {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-arrow {
  color: var(--color-text-3);
}

.content-preview {
  line-height: 1.8;
}

.content-preview p {
  text-indent: 2em;
  margin-bottom: 0.5em;
}

/* 漫画图片样式 */
.manga-images {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.manga-page {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
