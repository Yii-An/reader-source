<script setup lang="ts">
import type { CategoryGroup } from '../composables'

defineProps<{
  groups: CategoryGroup[]
  selectedGroupIndex: number
  selectedItemIndex: number
  loading: boolean
  categoriesLoading: boolean
  /** 当前页码 */
  page: number
  /** 是否支持分页（规则配置了 nextUrl） */
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
        <a-button
          v-for="(group, gIdx) in groups"
          :key="gIdx"
          :type="selectedGroupIndex === gIdx ? 'primary' : 'text'"
          size="small"
          @click="emit('select-group', gIdx)"
        >
          {{ group.name }}
        </a-button>
      </div>
      <div v-if="groups[selectedGroupIndex]?.items.length > 1" class="category-items">
        <a-button
          v-for="(item, iIdx) in groups[selectedGroupIndex].items"
          :key="iIdx"
          :type="selectedItemIndex === iIdx ? 'primary' : 'text'"
          size="small"
          @click="emit('select-item', iIdx)"
        >
          {{ item.name }}
        </a-button>
      </div>
    </div>

    <!-- 分页控件：仅当规则支持分页且已加载分类时显示 -->
    <div v-if="groups.length > 0 && hasPagination" class="pagination-controls">
      <a-button size="small" :disabled="page <= 1 || loading" @click="emit('prev-page')">
        <icon-left />
        上一页
      </a-button>
      <span class="page-indicator">第 {{ page }} 页</span>
      <a-button size="small" :disabled="loading" @click="emit('next-page')">
        下一页
        <icon-right />
      </a-button>
    </div>

    <a-button
      type="primary"
      size="small"
      :loading="loading || categoriesLoading"
      style="margin-top: 8px; width: 100%"
      @click="emit('test')"
    >
      <icon-thunderbolt />
      {{ groups.length > 0 ? '刷新列表' : '加载分类' }}
    </a-button>
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
