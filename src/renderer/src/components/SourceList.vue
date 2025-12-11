<script setup lang="ts">
import type { UniversalRule } from '../types/universal'
import { UniversalContentType } from '../types/universal'

defineProps<{
  sources: UniversalRule[]
  currentId: string
  searchQuery: string
}>()

const emit = defineEmits<{
  select: [source: UniversalRule]
  delete: [source: UniversalRule]
  'update:search-query': [query: string]
}>()
</script>

<template>
  <div class="source-list-container">
    <div class="source-search">
      <a-input-search
        :model-value="searchQuery"
        placeholder="搜索书源..."
        size="small"
        @update:model-value="emit('update:search-query', $event as string)"
      />
    </div>
    <div class="source-list">
      <div
        v-for="source in sources"
        :key="source.id"
        class="source-item"
        :class="{ active: currentId === source.id }"
        @click="emit('select', source)"
      >
        <div class="source-item-icon">
          <icon-book v-if="source.contentType === UniversalContentType.NOVEL" />
          <icon-image v-else-if="source.contentType === UniversalContentType.MANGA" />
          <icon-video-camera v-else />
        </div>
        <div class="source-item-info">
          <div class="source-item-name">{{ source.name }}</div>
          <div class="source-item-host">{{ source.host }}</div>
        </div>
        <a-dropdown trigger="click" @click.stop>
          <a-button type="text" size="mini"><icon-more /></a-button>
          <template #content>
            <a-doption @click="emit('select', source)">编辑</a-doption>
            <a-doption class="danger" @click="emit('delete', source)">删除</a-doption>
          </template>
        </a-dropdown>
      </div>
      <div v-if="sources.length === 0" class="empty-list">暂无书源</div>
    </div>
  </div>
</template>

<style scoped>
.source-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.source-search {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.source-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.source-item:hover {
  background: var(--color-bg-3);
}

.source-item.active {
  background: rgba(137, 180, 250, 0.15);
}

.source-item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  border-radius: 6px;
  color: var(--color-text-2);
}

.source-item-info {
  flex: 1;
  min-width: 0;
}

.source-item-name {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-item-host {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-list {
  padding: 24px;
  text-align: center;
  color: var(--color-text-3);
}

.danger {
  color: var(--color-danger);
}
</style>
