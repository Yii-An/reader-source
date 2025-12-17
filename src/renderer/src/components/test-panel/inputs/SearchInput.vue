<script setup lang="ts">
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from 'tdesign-icons-vue-next'

defineProps<{
  keyword: string
  loading: boolean
  page: number
  hasPagination: boolean
}>()

const emit = defineEmits<{
  'update:keyword': [value: string]
  'prev-page': []
  'next-page': []
  test: []
}>()
</script>

<template>
  <div class="search-input">
    <t-input
      :value="keyword"
      placeholder="输入搜索关键词..."
      @change="emit('update:keyword', $event as string)"
      @enter="emit('test')"
    >
      <template #suffix-icon>
        <search-icon />
      </template>
      <template #suffix>
        <t-button size="small" :loading="loading" @click="emit('test')">测试</t-button>
      </template>
    </t-input>

    <div v-if="hasPagination" class="pagination-controls">
      <t-button size="small" :disabled="page <= 1 || loading" @click="emit('prev-page')">
        <template #icon><chevron-left-icon /></template>
        上一页
      </t-button>
      <span class="page-indicator">第 {{ page }} 页</span>
      <t-button size="small" :disabled="loading" @click="emit('next-page')">
        下一页
        <template #suffix><chevron-right-icon /></template>
      </t-button>
    </div>
  </div>
</template>

<style scoped>
.search-input {
  margin-bottom: 8px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px;
  background: var(--color-bg-2);
  border-radius: 6px;
  margin-top: 8px;
}

.page-indicator {
  font-size: 12px;
  color: var(--color-text-2);
  min-width: 60px;
  text-align: center;
}
</style>
