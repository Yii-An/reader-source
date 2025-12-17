<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, FlashlightIcon } from 'tdesign-icons-vue-next'
import type { CategoryGroup } from '../composables'

defineProps<{
  groups: CategoryGroup[]
  selectedGroupIndex: number
  selectedItemIndex: number
  loading: boolean
  categoriesLoading: boolean
  page: number
  hasPagination: boolean
}>()

const emit = defineEmits<{
  'select-group': [index: number]
  'select-item': [index: number]
  'prev-page': []
  'next-page': []
  test: []
}>()
</script>

<template>
  <div class="discover-input">
    <div v-if="groups.length > 0" class="discover-category-panel">
      <div class="category-groups">
        <t-button
          v-for="(group, gIdx) in groups"
          :key="gIdx"
          :theme="selectedGroupIndex === gIdx ? 'primary' : 'default'"
          variant="text"
          size="small"
          @click="emit('select-group', gIdx)"
        >
          {{ group.name }}
        </t-button>
      </div>
      <div v-if="groups[selectedGroupIndex]?.items.length > 1" class="category-items">
        <t-button
          v-for="(item, iIdx) in groups[selectedGroupIndex].items"
          :key="iIdx"
          :theme="selectedItemIndex === iIdx ? 'primary' : 'default'"
          variant="text"
          size="small"
          @click="emit('select-item', iIdx)"
        >
          {{ item.name }}
        </t-button>
      </div>
    </div>

    <div v-if="groups.length > 0 && hasPagination" class="pagination-controls">
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
      :loading="loading || categoriesLoading"
      style="margin-top: 8px; width: 100%"
      @click="emit('test')"
    >
      <template #icon><flashlight-icon /></template>
      {{ groups.length > 0 ? '刷新列表' : '加载分类' }}
    </t-button>
  </div>
</template>

<style scoped>
.discover-input {
  margin-bottom: 8px;
}

.discover-category-panel {
  background: var(--color-bg-3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.category-groups,
.category-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-items {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
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
