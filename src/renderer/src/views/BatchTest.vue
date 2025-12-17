<!--
  @file BatchTest.vue - 批量测试页面
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeftIcon, LoadingIcon } from 'tdesign-icons-vue-next'
import { useSourceStore } from '../stores/sourceStore'
import { useLogStore } from '../stores/logStore'
import {
  useBatchTest,
  type BatchTestResult
} from '../components/test-panel/composables/useBatchTest'
import ResultTabs from '../components/test-panel/results/ResultTabs.vue'
import type { UniversalRule } from '../types/universal'

const router = useRouter()
const sourceStore = useSourceStore()
const logStore = useLogStore()
const { runBatchTest } = useBatchTest()

const keyword = ref('')
const selectedSourceIds = ref<string[]>([])
const testResults = ref<Map<string, BatchTestResult>>(new Map())
const testing = ref(false)
const selectedDetailId = ref<string | null>(null)

const isAllSelected = computed(() => {
  return (
    sourceStore.sources.length > 0 && selectedSourceIds.value.length === sourceStore.sources.length
  )
})

const testStats = computed(() => {
  let success = 0
  let error = 0
  let pending = 0
  let totalCount = 0

  testResults.value.forEach((result) => {
    if (result.status === 'success') {
      success++
      totalCount += result.count
    } else if (result.status === 'error') {
      error++
    } else {
      pending++
    }
  })

  return { success, error, pending, totalCount }
})

const selectedSource = computed<UniversalRule | undefined>(() => {
  if (!selectedDetailId.value) return undefined
  return sourceStore.sources.find((s) => s.id === selectedDetailId.value)
})

const selectedResult = computed<BatchTestResult | undefined>(() => {
  if (!selectedDetailId.value) return undefined
  return testResults.value.get(selectedDetailId.value)
})

selectedSourceIds.value = sourceStore.sources.map((s) => s.id)

function goBack(): void {
  router.push('/')
}

function toggleSelectAll(): void {
  if (isAllSelected.value) {
    selectedSourceIds.value = []
  } else {
    selectedSourceIds.value = sourceStore.sources.map((s) => s.id)
  }
}

function toggleSource(id: string): void {
  const index = selectedSourceIds.value.indexOf(id)
  if (index > -1) {
    selectedSourceIds.value.splice(index, 1)
  } else {
    selectedSourceIds.value.push(id)
  }
}

function selectSourceDetail(id: string): void {
  selectedDetailId.value = id
}

async function handleTest(): Promise<void> {
  if (!keyword.value.trim()) {
    logStore.warn('请输入搜索关键词')
    return
  }

  if (selectedSourceIds.value.length === 0) {
    logStore.warn('请选择至少一个书源')
    return
  }

  testing.value = true
  testResults.value = new Map()
  selectedDetailId.value = null

  const selectedSources = sourceStore.sources.filter((s) => selectedSourceIds.value.includes(s.id))

  await runBatchTest(selectedSources, keyword.value.trim(), (id, result) => {
    testResults.value.set(id, result)
    testResults.value = new Map(testResults.value)
  })

  testing.value = false
  logStore.info(
    `[批量测试] 完成: ${testStats.value.success} 成功, ${testStats.value.error} 失败, 共 ${testStats.value.totalCount} 条结果`
  )
}

function getResultStatus(source: UniversalRule): { text: string; type: string } {
  const result = testResults.value.get(source.id)
  if (!result) return { text: '', type: '' }

  switch (result.status) {
    case 'pending':
      return { text: '等待中', type: 'pending' }
    case 'running':
      return { text: '测试中...', type: 'running' }
    case 'success':
      return { text: `${result.count} 条 (${result.duration}ms)`, type: 'success' }
    case 'error':
      return { text: '失败', type: 'error' }
    default:
      return { text: '', type: '' }
  }
}
</script>

<template>
  <div class="batch-test-page">
    <div class="page-header">
      <div class="header-left">
        <t-button @click="goBack">
          <template #icon><chevron-left-icon /></template>
          返回
        </t-button>
        <t-divider layout="vertical" />
        <span class="page-title">批量测试</span>
      </div>
      <div class="header-center">
        <t-input
          v-model="keyword"
          placeholder="输入搜索关键词"
          :disabled="testing"
          style="width: 300px"
          @enter="handleTest"
        />
        <t-button
          theme="primary"
          :loading="testing"
          :disabled="!keyword.trim() || selectedSourceIds.length === 0"
          style="margin-left: 12px"
          @click="handleTest"
        >
          {{ testing ? '测试中...' : '开始测试' }}
        </t-button>
      </div>
      <div class="header-right">
        <div v-if="testResults.size > 0" class="test-stats">
          <span class="stat-success">✓ {{ testStats.success }}</span>
          <span class="stat-error">✗ {{ testStats.error }}</span>
          <span class="stat-total">共 {{ testStats.totalCount }} 条结果</span>
        </div>
      </div>
    </div>

    <div class="page-body">
      <div class="source-list-panel">
        <div class="panel-header">
          <t-checkbox
            :checked="isAllSelected"
            :indeterminate="selectedSourceIds.length > 0 && !isAllSelected"
            :disabled="testing"
            @change="toggleSelectAll"
          >
            全选 ({{ selectedSourceIds.length }}/{{ sourceStore.sources.length }})
          </t-checkbox>
        </div>
        <div class="source-list">
          <div
            v-for="source in sourceStore.sources"
            :key="source.id"
            class="source-item"
            :class="{
              selected: selectedDetailId === source.id,
              'status-success': testResults.get(source.id)?.status === 'success',
              'status-error': testResults.get(source.id)?.status === 'error',
              'status-running': testResults.get(source.id)?.status === 'running'
            }"
            @click="selectSourceDetail(source.id)"
          >
            <t-checkbox
              :checked="selectedSourceIds.includes(source.id)"
              :disabled="testing"
              @click.stop
              @change="toggleSource(source.id)"
            />
            <div class="source-info">
              <div class="source-name">{{ source.name }}</div>
              <div class="source-host">{{ source.host }}</div>
            </div>
            <div class="source-status" :class="getResultStatus(source).type">
              <loading-icon v-if="testResults.get(source.id)?.status === 'running'" />
              <span>{{ getResultStatus(source).text }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-panel">
        <template v-if="selectedSource && selectedResult">
          <div class="detail-header">
            <h3>{{ selectedSource.name }}</h3>
            <span class="detail-host">{{ selectedSource.host }}</span>
          </div>
          <div class="detail-content">
            <template v-if="selectedResult.status === 'success'">
              <ResultTabs
                type="search"
                :visual-data="selectedResult.visualData || []"
                :parsed-result="selectedResult.parsedResult || []"
                :raw-html="selectedResult.rawHtml || ''"
              />
            </template>
            <template v-else-if="selectedResult.status === 'error'">
              <t-result theme="error" :title="selectedResult.error" />
            </template>
            <template v-else-if="selectedResult.status === 'running'">
              <div class="loading-state">
                <t-loading size="32px" />
                <span>正在测试...</span>
              </div>
            </template>
            <template v-else>
              <div class="loading-state">
                <span>等待测试</span>
              </div>
            </template>
          </div>
        </template>
        <template v-else>
          <t-empty description="选择左侧书源查看详细结果" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.batch-test-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-1);
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
}

.header-center {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.test-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
}

.stat-success {
  color: var(--color-success);
}

.stat-error {
  color: var(--color-danger);
}

.stat-total {
  color: var(--color-text-2);
  font-weight: 500;
}

.page-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.source-list-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-2);
}

.panel-header {
  flex-shrink: 0;
  padding: 12px 16px;
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
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-3);
}

.source-item:hover {
  background: var(--color-fill-2);
}

.source-item.selected {
  background: rgba(22, 93, 255, 0.1);
  border: 1px solid rgba(22, 93, 255, 0.3);
}

.source-item.status-running {
  background: rgba(22, 93, 255, 0.08);
}

.source-item.status-success {
  background: rgba(0, 180, 42, 0.08);
}

.source-item.status-error {
  background: rgba(245, 63, 63, 0.08);
}

.source-info {
  flex: 1;
  min-width: 0;
}

.source-name {
  font-weight: 500;
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

.source-status {
  font-size: 12px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.source-status.success {
  color: var(--color-success);
}

.source-status.error {
  color: var(--color-danger);
}

.source-status.running {
  color: var(--color-primary);
}

.source-status.pending {
  color: var(--color-text-3);
}

.detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  background: var(--color-bg-1);
}

.detail-header {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.detail-header h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 500;
}

.detail-host {
  font-size: 13px;
  color: var(--color-text-3);
}

.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: var(--color-text-3);
}

.detail-content :deep(.result-display-tabs) {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
</style>
