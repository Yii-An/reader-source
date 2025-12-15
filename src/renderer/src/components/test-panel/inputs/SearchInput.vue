<script setup lang="ts">
defineProps<{
  keyword: string
  loading: boolean
  /** 当前页码 */
  page: number
  /** 是否支持分页（URL 包含 $page 变量） */
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
    <a-input-search
      :model-value="keyword"
      placeholder="输入搜索关键词..."
      :loading="loading"
      @update:model-value="emit('update:keyword', $event as string)"
      @search="emit('test')"
    >
      <template #button-default>测试</template>
    </a-input-search>

    <!-- 分页控件：仅当支持分页且已有搜索结果时显示 -->
    <div v-if="hasPagination" class="pagination-controls">
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
