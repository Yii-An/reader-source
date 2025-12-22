<script setup lang="ts">
import { DeleteIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'
import type { LogItem } from '../types'

defineProps<{
  logs: LogItem[]
}>()

const emit = defineEmits<{
  clear: []
  collapse: []
}>()

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<template>
  <div class="log-panel-container">
    <div class="log-header">
      <span class="log-title">调试日志</span>
      <t-space size="medium">
        <t-button size="medium" variant="text" @click="emit('clear')">
          <template #icon><delete-icon /></template>
        </t-button>
        <t-button size="medium" variant="text" @click="emit('collapse')">
          <template #icon><chevron-down-icon /></template>
        </t-button>
      </t-space>
    </div>
    <div class="log-list">
      <div v-for="log in logs.slice(0, 50)" :key="log.id" class="log-item">
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span :class="['log-level', `log-level-${log.level}`]">{{ log.level }}</span>
        <span class="log-message">{{ log.message }}</span>
      </div>
      <div v-if="logs.length === 0" class="log-empty">暂无日志</div>
    </div>
  </div>
</template>

<style scoped>
.log-panel-container {
  display: flex;
  flex-direction: column;
  height: 0;
  flex: auto;
  background: var(--color-bg-3);
  border-top: 1px solid var(--color-border);
}

.log-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-bg-2);
}

.log-title {
  font-size: 12px;
  font-weight: 500;
}

.log-list {
  height: 0;
  flex: auto;
  overflow-y: auto;
  padding: 8px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
}

.log-time {
  color: var(--color-text-3);
}

.log-level {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.log-level-info {
  background: rgba(137, 180, 250, 0.2);
  color: #89b4fa;
}
.log-level-debug {
  background: rgba(108, 112, 134, 0.2);
  color: #6c7086;
}
.log-level-warn {
  background: rgba(250, 179, 135, 0.2);
  color: #fab387;
}
.log-level-error {
  background: rgba(243, 139, 168, 0.2);
  color: #f38ba8;
}

.log-message {
  flex: 1;
  color: var(--color-text-2);
}

.log-empty {
  text-align: center;
  color: var(--color-text-3);
  padding: 16px;
  font-size: 12px;
}
</style>
