<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, FlashlightIcon } from 'tdesign-icons-vue-next'

defineProps<{
  url: string
  loading: boolean
  page: number
  hasPagination: boolean
}>()

const emit = defineEmits<{
  'update:url': [value: string]
  'prev-page': []
  'next-page': []
  test: []
}>()
</script>

<template>
  <div class="chapter-input">
    <t-input
      :value="url"
      placeholder="章节页URL"
      style="margin-bottom: 8px"
      @change="emit('update:url', $event as string)"
    />

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

    <t-button
      theme="primary"
      size="small"
      :loading="loading"
      style="width: 100%"
      @click="emit('test')"
    >
      <template #icon><flashlight-icon /></template>
      执行测试
    </t-button>
  </div>
</template>

<style scoped>
.chapter-input {
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
  margin-bottom: 8px;
}

.page-indicator {
  font-size: 12px;
  color: var(--color-text-2);
  min-width: 60px;
  text-align: center;
}
</style>
