<!--
  @file ResultTabs.vue - 测试结果展示标签页
  @description 测试面板的结果展示组件，提供三种查看模式：
               1. 可视化 (visual)：根据类型展示对应的可视化组件
               2. 解析结果 (parsed)：以格式化 JSON 展示结构化解析数据
               3. 原始数据 (raw)：展示原始 HTML 响应内容

               使用方式：
               <ResultTabs
                 type="search"
                 :visual-data="searchResults"
                 :parsed-result="data"
                 :raw-html="html"
                 :is-manga="false"
                 @select="handleSelect"
               />
-->
<script setup lang="ts">
import { ref, computed } from 'vue'

// 导入可视化组件
import SearchResultList from './SearchResultList.vue'
import DiscoverResultList from './DiscoverResultList.vue'
import ChapterResultList from './ChapterResultList.vue'
import ContentPreview from './ContentPreview.vue'

// ==================== Props 定义 ====================
const props = defineProps<{
  /** 测试类型 */
  type: 'search' | 'discover' | 'chapter' | 'content'
  /** 可视化数据（搜索结果、发现结果、章节列表或正文内容） */
  visualData: unknown[]
  /** 解析后的结构化数据 */
  parsedResult: unknown[]
  /** 原始 HTML 响应 */
  rawHtml: string
  /** 是否为漫画类型（仅 content 类型需要） */
  isManga?: boolean
}>()

// ==================== Emits 定义 ====================
const emit = defineEmits<{
  /** 选择结果项事件 */
  select: [item: { name: string; url: string }]
}>()

// ==================== 组件状态 ====================
const activeTab = ref<'visual' | 'parsed' | 'raw'>('visual')

// ==================== 类型断言辅助 ====================
/** 搜索/发现结果类型 */
type ListResult = { name: string; url: string; cover?: string; author?: string }
/** 章节结果类型 */
type ChapterResult = { name: string; url: string }

const searchData = computed(() => props.visualData as ListResult[])
const chapterData = computed(() => props.visualData as ChapterResult[])
const contentData = computed(() => props.visualData as string[])

// ==================== 事件处理 ====================
function handleSelect(item: { name: string; url: string }): void {
  emit('select', item)
}
</script>

<template>
  <!-- 结果展示标签页容器 -->
  <div class="result-display-tabs">
    <a-tabs
      v-model:active-key="activeTab"
      size="small"
      type="card-gutter"
      justify
      destroy-on-hide
      lazy-load
    >
      <!-- 可视化标签页 -->
      <a-tab-pane key="visual" title="可视化">
        <SearchResultList
          v-if="type === 'search' && visualData.length > 0"
          :results="searchData"
          @select="handleSelect"
        />
        <DiscoverResultList
          v-else-if="type === 'discover' && visualData.length > 0"
          :results="searchData"
          @select="handleSelect"
        />
        <ChapterResultList
          v-else-if="type === 'chapter' && visualData.length > 0"
          :results="chapterData"
          @select="handleSelect"
        />
        <ContentPreview
          v-else-if="type === 'content' && visualData.length > 0"
          :content="contentData"
          :is-manga="isManga || false"
        />
        <a-empty v-else description="暂无可视化结果" />
      </a-tab-pane>

      <!-- 解析结果标签页 -->
      <a-tab-pane key="parsed" title="解析结果">
        <pre class="code-content">{{ JSON.stringify(parsedResult, null, 2) }}</pre>
      </a-tab-pane>

      <!-- 原始数据标签页 -->
      <a-tab-pane key="raw" title="原始数据">
        <pre class="code-content">{{ rawHtml }}</pre>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.result-display-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

/* 让 tabs 占满容器高度 */
.result-display-tabs :deep(.arco-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 标签栏固定高度 */
.result-display-tabs :deep(.arco-tabs-nav) {
  flex-shrink: 0;
}

/* 内容区域占满剩余空间 */
.result-display-tabs :deep(.arco-tabs-content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 单个 tab-pane 占满内容区域 */
.result-display-tabs :deep(.arco-tabs-content-item) {
  height: 100%;
  overflow: auto;
}

.code-content {
  margin: 0;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--color-text-2);
}
</style>
