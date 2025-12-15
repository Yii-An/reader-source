<script setup lang="ts">
import type { ChapterResult } from '../composables'

defineProps<{
  results: ChapterResult[]
}>()

const emit = defineEmits<{
  select: [item: ChapterResult]
}>()
</script>

<template>
  <div class="result-list">
    <div
      v-for="(item, index) in results"
      :key="index"
      class="result-item"
      @click="emit('select', item)"
    >
      <div class="result-info">
        <div class="result-name">{{ item.name }}</div>
        <div class="result-url">{{ item.url }}</div>
      </div>
      <icon-right class="result-arrow" />
    </div>
  </div>
</template>

<style scoped>
.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  padding-left: 14px;
  background: var(--color-bg-3);
  border-radius: 8px;
  border-left: 3px solid rgb(var(--primary-6));
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background: var(--color-fill-3);
  transform: translateX(4px);
  border-left-color: rgb(var(--primary-5));
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
  margin-bottom: 4px;
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
  flex-shrink: 0;
  transition: transform 0.2s;
}

.result-item:hover .result-arrow {
  transform: translateX(4px);
  color: rgb(var(--primary-6));
}
</style>
