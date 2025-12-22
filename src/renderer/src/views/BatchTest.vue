<!--
  @file BatchTest.vue - 批量测试页面（顺序链式测试版）
  测试流程: 搜索 → 章节 → 正文 → 发现
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeftIcon } from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import { useSourceStore } from '../stores/sourceStore'
import { useBatchTest } from '../components/test-panel/composables/useBatchTest'
import {
  BatchTestToolbar,
  BatchTestConfig,
  BatchTestSourceList,
  BatchTestDetail
} from '../components/batch-test'
import type { UniversalRule } from '../types/universal'
import type { ChainTestResult } from '../types/batch-test'

const router = useRouter()
const sourceStore = useSourceStore()
const { config, testing, runBatchTest, cancelTest, retrySource, saveConfig } = useBatchTest()

// Input state
const keyword = ref('')

// Selection state
const selectedSourceIds = ref<string[]>([])
const testResults = ref<Map<string, ChainTestResult>>(new Map())
const selectedDetailId = ref<string | null>(null)

// Config drawer
const showConfigDrawer = ref(false)

// Computed
const testStats = computed(() => {
  let success = 0
  let error = 0
  let running = 0

  testResults.value.forEach((result) => {
    if (result.currentStep === 'completed') {
      const hasError =
        result.search.status === 'error' ||
        result.chapter.status === 'error' ||
        result.content.status === 'error' ||
        (result.hasDiscover && result.discover.status === 'error')
      if (hasError) {
        error++
      } else {
        success++
      }
    } else if (result.currentStep !== 'search' || result.search.status === 'running') {
      running++
    }
  })

  const total = testResults.value.size

  return { success, error, running, total }
})

const selectedSource = computed<UniversalRule | undefined>(() => {
  if (!selectedDetailId.value) return undefined
  return sourceStore.sources.find((s) => s.id === selectedDetailId.value)
})

const selectedResult = computed<ChainTestResult | undefined>(() => {
  if (!selectedDetailId.value) return undefined
  return testResults.value.get(selectedDetailId.value)
})

const canStartTest = computed(() => {
  return selectedSourceIds.value.length > 0 && keyword.value.trim().length > 0
})

const progressPercent = computed(() => {
  if (testStats.value.total === 0) return 0
  const completed = testStats.value.success + testStats.value.error
  return Math.round((completed / testStats.value.total) * 100)
})

// Initialize
selectedSourceIds.value = sourceStore.sources.map((s) => s.id)

// Watch config changes
watch(
  config,
  () => {
    saveConfig()
  },
  { deep: true }
)

// Methods
function goBack(): void {
  router.push('/')
}

async function handleTest(): Promise<void> {
  if (!canStartTest.value) {
    MessagePlugin.warning('请输入搜索关键词')
    return
  }

  testResults.value = new Map()
  selectedDetailId.value = null

  const selectedSources = sourceStore.sources.filter((s) => selectedSourceIds.value.includes(s.id))

  await runBatchTest(selectedSources, keyword.value.trim(), (id, result) => {
    testResults.value.set(id, result)
    testResults.value = new Map(testResults.value)
  })

  MessagePlugin.success(`测试完成: ${testStats.value.success} 成功, ${testStats.value.error} 失败`)
}

function handleCancel(): void {
  cancelTest()
  MessagePlugin.info('已取消测试')
}

async function handleRetry(source: UniversalRule): Promise<void> {
  await retrySource(source, keyword.value.trim(), (id, result) => {
    testResults.value.set(id, result)
    testResults.value = new Map(testResults.value)
  })
}

async function handleRetryAll(): Promise<void> {
  const failedSources = sourceStore.sources.filter((s) => {
    const result = testResults.value.get(s.id)
    if (!result) return false
    return (
      result.search.status === 'error' ||
      result.chapter.status === 'error' ||
      result.content.status === 'error' ||
      (result.hasDiscover && result.discover.status === 'error')
    )
  })

  if (failedSources.length === 0) {
    MessagePlugin.info('没有需要重试的书源')
    return
  }

  MessagePlugin.info(`开始重试 ${failedSources.length} 个书源`)

  for (const source of failedSources) {
    await handleRetry(source)
  }

  MessagePlugin.success('重试完成')
}
</script>

<template>
  <div class="batch-test-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <t-button @click="goBack">
          <template #icon><chevron-left-icon /></template>
          返回
        </t-button>
        <t-divider layout="vertical" />
        <span class="page-title">批量测试</span>
      </div>

      <BatchTestToolbar
        :testing="testing"
        :keyword="keyword"
        :can-start="canStartTest"
        @update:keyword="keyword = $event"
        @start="handleTest"
        @cancel="handleCancel"
        @open-config="showConfigDrawer = true"
      />

      <div class="header-right">
        <div v-if="testResults.size > 0" class="test-stats">
          <span class="stat-success">✓ {{ testStats.success }}</span>
          <span class="stat-error">✗ {{ testStats.error }}</span>
          <span v-if="testStats.running > 0" class="stat-running">● {{ testStats.running }}</span>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    <div v-if="testing || testResults.size > 0" class="progress-bar">
      <t-progress
        :percentage="progressPercent"
        :color="testing ? 'var(--color-primary)' : 'var(--color-success)'"
        :stroke-width="2"
        :show-label="false"
      />
    </div>

    <!-- Body -->
    <div class="page-body">
      <BatchTestSourceList
        :sources="sourceStore.sources"
        :selected-ids="selectedSourceIds"
        :results="testResults"
        :selected-detail-id="selectedDetailId"
        :testing="testing"
        @update:selected-ids="selectedSourceIds = $event"
        @select-detail="selectedDetailId = $event"
        @retry="handleRetry"
        @retry-all="handleRetryAll"
      />

      <BatchTestDetail
        :source="selectedSource"
        :result="selectedResult"
        :testing="testing"
        @retry="handleRetry"
      />
    </div>

    <!-- Config drawer -->
    <BatchTestConfig
      :visible="showConfigDrawer"
      :config="config"
      @update:visible="showConfigDrawer = $event"
      @update:concurrency="config.concurrency = $event"
      @update:timeout="config.timeout = $event"
      @update:continue-on-timeout="config.continueOnTimeout = $event"
      @update:continue-on-error="config.continueOnError = $event"
    />
  </div>
</template>

<style scoped>
.batch-test-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  gap: 12px;
  padding: 12px 16px 16px;
  box-sizing: border-box;
  background: var(--color-bg-1);
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 12px;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.test-stats {
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.test-stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border);
  font-weight: 500;
}

.stat-success {
  color: var(--color-success);
  border-color: rgba(0, 180, 42, 0.3);
}

.stat-error {
  color: var(--color-error);
  border-color: rgba(245, 63, 63, 0.35);
}

.stat-running {
  color: var(--color-primary);
  border-color: rgba(22, 93, 255, 0.35);
}

.progress-bar {
  flex-shrink: 0;
  padding: 0 4px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
}

.page-body {
  flex: 1;
  display: flex;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}
</style>
