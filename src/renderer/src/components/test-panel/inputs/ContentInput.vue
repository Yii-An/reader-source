<script setup lang="ts">
defineProps<{
  url: string
  loading: boolean
  /** 当前页码 */
  page: number
  /** 是否支持分页 */
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
  <div class="content-input">
    <a-input
      :model-value="url"
      placeholder="正文页URL"
      style="margin-bottom: 8px"
      @update:model-value="emit('update:url', $event as string)"
    />

    <!-- 分页控件：仅当支持分页时显示 -->
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

    <a-button
      type="primary"
      size="small"
      :loading="loading"
      style="width: 100%"
      @click="emit('test')"
    >
      <icon-thunderbolt /> 执行测试
    </a-button>
  </div>
</template>

<style scoped>
.content-input {
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
