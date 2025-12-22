<!--
  @file BatchTestSourceList.vue - 批量测试书源列表组件
  使用 4 个圆环显示测试进度：搜索、章节、正文、发现
-->
<script setup lang="ts">
import { computed } from 'vue'
import { RefreshIcon } from 'tdesign-icons-vue-next'
import type { UniversalRule } from '../../types/universal'
import type { ChainTestResult, ChainStepStatus } from '../../types/batch-test'

interface Props {
  sources: UniversalRule[]
  selectedIds: string[]
  results: Map<string, ChainTestResult>
  selectedDetailId: string | null
  testing: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:selectedIds': [value: string[]]
  selectDetail: [id: string]
  retry: [source: UniversalRule]
  retryAll: []
}>()

const isAllSelected = computed(() => {
  return props.sources.length > 0 && props.selectedIds.length === props.sources.length
})

const failedCount = computed(() => {
  let count = 0
  props.results.forEach((result) => {
    if (
      result.search.status === 'error' ||
      result.chapter.status === 'error' ||
      result.content.status === 'error' ||
      (result.hasDiscover && result.discover.status === 'error')
    ) {
      count++
    }
  })
  return count
})

function toggleSelectAll(): void {
  if (isAllSelected.value) {
    emit('update:selectedIds', [])
  } else {
    emit(
      'update:selectedIds',
      props.sources.map((s) => s.id)
    )
  }
}

function toggleSource(id: string): void {
  const newIds = [...props.selectedIds]
  const index = newIds.indexOf(id)
  if (index > -1) {
    newIds.splice(index, 1)
  } else {
    newIds.push(id)
  }
  emit('update:selectedIds', newIds)
}

function getStepClass(status: ChainStepStatus): string {
  switch (status) {
    case 'success':
      return 'step-success'
    case 'running':
      return 'step-running'
    case 'error':
      return 'step-error'
    case 'skipped':
      return 'step-skipped'
    default:
      return 'step-pending'
  }
}

function hasError(result: ChainTestResult): boolean {
  return (
    result.search.status === 'error' ||
    result.chapter.status === 'error' ||
    result.content.status === 'error' ||
    (result.hasDiscover && result.discover.status === 'error')
  )
}

function isComplete(result: ChainTestResult): boolean {
  return result.currentStep === 'completed'
}

function formatDuration(ms?: number): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <div class="source-list-panel">
    <div class="panel-header">
      <div class="panel-header-top">
        <t-checkbox
          :checked="isAllSelected"
          :indeterminate="selectedIds.length > 0 && !isAllSelected"
          :disabled="testing"
          @change="toggleSelectAll"
        >
          全选 ({{ selectedIds.length }}/{{ sources.length }})
        </t-checkbox>

        <t-button
          v-if="failedCount > 0"
          size="medium"
          variant="text"
          :disabled="testing"
          @click="$emit('retryAll')"
        >
          <template #icon><refresh-icon /></template>
          重试失败 ({{ failedCount }})
        </t-button>
      </div>
    </div>

    <div class="source-list">
      <div
        v-for="source in sources"
        :key="source.id"
        class="source-item"
        :class="{
          selected: selectedDetailId === source.id,
          'has-error': results.get(source.id) && hasError(results.get(source.id)!),
          'is-complete':
            results.get(source.id) &&
            isComplete(results.get(source.id)!) &&
            !hasError(results.get(source.id)!)
        }"
        @click="$emit('selectDetail', source.id)"
      >
        <t-checkbox
          :checked="selectedIds.includes(source.id)"
          :disabled="testing"
          @click.stop
          @change="toggleSource(source.id)"
        />
        <div class="source-info">
          <div class="source-name">{{ source.name }}</div>
          <div class="source-host">{{ source.host }}</div>
        </div>

        <!-- 4 Step Circles -->
        <div v-if="results.get(source.id)" class="step-circles">
          <div
            class="step-circle"
            :class="getStepClass(results.get(source.id)!.search.status)"
            title="搜索"
          />
          <div
            class="step-circle"
            :class="getStepClass(results.get(source.id)!.chapter.status)"
            title="章节"
          />
          <div
            class="step-circle"
            :class="getStepClass(results.get(source.id)!.content.status)"
            title="正文"
          />
          <div
            class="step-circle"
            :class="getStepClass(results.get(source.id)!.discover.status)"
            title="发现"
          />
        </div>

        <!-- Duration -->
        <div v-if="results.get(source.id)?.totalDuration" class="source-duration">
          {{ formatDuration(results.get(source.id)!.totalDuration) }}
        </div>

        <!-- Retry button -->
        <t-button
          v-if="results.get(source.id) && hasError(results.get(source.id)!) && !testing"
          size="medium"
          variant="text"
          @click.stop="$emit('retry', source)"
        >
          重试
        </t-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.source-list-panel {
  width: min(380px, 42vw);
  max-width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg-2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.panel-header {
  flex-shrink: 0;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-2);
}

.panel-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.source-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: var(--color-bg-1);
}

.source-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.18s ease;
  background: var(--color-bg-3);
}

.source-item:hover {
  background: var(--color-fill-2);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
}

.source-item.selected {
  background: rgba(22, 93, 255, 0.08);
  border-color: rgba(22, 93, 255, 0.45);
  box-shadow: 0 8px 18px rgba(22, 93, 255, 0.12);
}

.source-item.is-complete {
  background: rgba(0, 180, 42, 0.06);
  border-color: rgba(0, 180, 42, 0.25);
}

.source-item.has-error {
  background: rgba(245, 63, 63, 0.06);
  border-color: rgba(245, 63, 63, 0.25);
}

.source-info {
  flex: 1;
  min-width: 0;
}

.source-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-host {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 4 Step Circles */
.step-circles {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
}

.step-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-border);
  transition: all 0.3s;
}

.step-circle.step-pending {
  background: var(--color-border);
}

.step-circle.step-running {
  background: var(--color-primary);
  animation: pulse 1s infinite;
}

.step-circle.step-success {
  background: var(--color-success);
}

.step-circle.step-error {
  background: var(--color-error);
}

.step-circle.step-skipped {
  background: var(--color-text-4);
  opacity: 0.4;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.source-duration {
  font-size: 12px;
  color: var(--color-text-3);
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  white-space: nowrap;
}
</style>
