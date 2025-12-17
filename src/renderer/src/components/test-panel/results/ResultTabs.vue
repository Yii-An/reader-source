<!--
  @file ResultTabs.vue - 测试结果展示标签页
-->
<script setup lang="ts">
import { ref, computed } from 'vue'

import BookResultList from './BookResultList.vue'
import ChapterResultList from './ChapterResultList.vue'
import ContentPreview from './ContentPreview.vue'

const props = defineProps<{
  type: 'search' | 'discover' | 'chapter' | 'content'
  visualData: unknown[]
  parsedResult: unknown[]
  rawHtml: string
  isManga?: boolean
}>()

const emit = defineEmits<{
  select: [item: { name: string; url: string }]
}>()

const activeTab = ref<'visual' | 'parsed' | 'raw'>('visual')

type ListResult = { name: string; url: string; cover?: string; author?: string }
type ChapterResult = { name: string; url: string }

const searchData = computed(() => props.visualData as ListResult[])
const chapterData = computed(() => props.visualData as ChapterResult[])
const contentData = computed(() => props.visualData as string[])

function handleSelect(item: { name: string; url: string }): void {
  emit('select', item)
}
</script>

<template>
  <div class="result-display-tabs">
    <t-tabs v-model="activeTab" size="small">
      <t-tab-panel value="visual" label="可视化">
        <BookResultList
          v-if="(type === 'search' || type === 'discover') && visualData.length > 0"
          :results="searchData"
          :show-cover="true"
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
        <t-empty v-else description="暂无可视化结果" />
      </t-tab-panel>

      <t-tab-panel value="parsed" label="解析结果">
        <pre class="code-content">{{ JSON.stringify(parsedResult, null, 2) }}</pre>
      </t-tab-panel>

      <t-tab-panel value="raw" label="原始数据">
        <pre class="code-content">{{ rawHtml }}</pre>
      </t-tab-panel>
    </t-tabs>
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

.result-display-tabs :deep(.t-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.result-display-tabs :deep(.t-tabs__nav) {
  flex-shrink: 0;
}

.result-display-tabs :deep(.t-tabs__content) {
  flex: 1;
  min-height: 0;
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
