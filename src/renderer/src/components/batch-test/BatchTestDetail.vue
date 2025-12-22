<!--
  @file BatchTestDetail.vue - 批量测试详情面板组件
  使用 Tab 切换显示 4 个步骤的结果，Tab 标题包含状态和耗时
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RefreshIcon } from 'tdesign-icons-vue-next'
import type { UniversalRule } from '../../types/universal'
import type { ChainTestResult, ChainStepStatus } from '../../types/batch-test'

interface Props {
  source?: UniversalRule
  result?: ChainTestResult
  testing: boolean
}

const props = defineProps<Props>()

defineEmits<{
  retry: [source: UniversalRule]
}>()

const activeTab = ref<'search' | 'chapter' | 'content' | 'discover'>('search')

// Reset to search tab when source changes
watch(
  () => props.source?.id,
  () => {
    activeTab.value = 'search'
  }
)

function getStatusIcon(status: ChainStepStatus): string {
  switch (status) {
    case 'success':
      return '✓'
    case 'running':
      return '●'
    case 'error':
      return '✗'
    case 'skipped':
      return '⊘'
    default:
      return '○'
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function hasError(): boolean {
  if (!props.result) return false
  return (
    props.result.search.status === 'error' ||
    props.result.chapter.status === 'error' ||
    props.result.content.status === 'error' ||
    (props.result.hasDiscover && props.result.discover.status === 'error')
  )
}

const searchLabel = computed(() => {
  if (!props.result) return '搜索'
  const { status, duration, count } = props.result.search
  const icon = getStatusIcon(status)
  const time = formatDuration(duration)
  const countStr = status === 'success' && count ? `(${count})` : ''
  return `${icon} 搜索${countStr} ${time}`.trim()
})

const chapterLabel = computed(() => {
  if (!props.result) return '章节'
  const { status, duration, count } = props.result.chapter
  const icon = getStatusIcon(status)
  const time = formatDuration(duration)
  const countStr = status === 'success' && count ? `(${count})` : ''
  return `${icon} 章节${countStr} ${time}`.trim()
})

const contentLabel = computed(() => {
  if (!props.result) return '正文'
  const { status, duration } = props.result.content
  const icon = getStatusIcon(status)
  const time = formatDuration(duration)
  return `${icon} 正文 ${time}`.trim()
})

const discoverLabel = computed(() => {
  if (!props.result) return '发现'
  const { status, duration, count, groups } = props.result.discover
  const icon = getStatusIcon(status)
  const time = formatDuration(duration)
  const extra = status === 'success' ? `(${groups.length}分类/${count || 0}条)` : ''
  return `${icon} 发现${extra} ${time}`.trim()
})
</script>

<template>
  <div class="detail-panel">
    <template v-if="source && result">
      <div class="detail-header">
        <div class="detail-title">
          <h3>{{ source.name }}</h3>
          <t-button
            v-if="hasError() && !testing"
            size="medium"
            variant="outline"
            @click="$emit('retry', source)"
          >
            <template #icon><refresh-icon /></template>
            重试
          </t-button>
        </div>
        <span class="detail-host">{{ source.host }}</span>
      </div>

      <!-- Tabs for 4 steps -->
      <t-tabs v-model="activeTab" class="step-tabs">
        <t-tab-panel value="search" :label="searchLabel">
          <div class="tab-content">
            <template v-if="result.search.status === 'success'">
              <div class="result-list">
                <div
                  v-for="(item, idx) in result.search.results.slice(0, 20)"
                  :key="idx"
                  class="result-item"
                  :class="{ 'is-selected': idx === 0 }"
                >
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-meta">{{ item.author || '' }}</div>
                  <div class="item-url">{{ item.url }}</div>
                </div>
                <div v-if="result.search.results.length > 20" class="more-hint">
                  + {{ result.search.results.length - 20 }} 条更多结果
                </div>
              </div>
            </template>
            <template v-else-if="result.search.status === 'error'">
              <t-result theme="error" :title="result.search.error" />
            </template>
            <template v-else-if="result.search.status === 'running'">
              <div class="loading-state">
                <t-loading size="32px" />
                <span>正在搜索...</span>
              </div>
            </template>
            <template v-else>
              <div class="loading-state">
                <span>等待测试</span>
              </div>
            </template>
          </div>
        </t-tab-panel>

        <t-tab-panel value="chapter" :label="chapterLabel">
          <div class="tab-content">
            <template v-if="result.chapter.status === 'success'">
              <div class="result-list">
                <div
                  v-for="(item, idx) in result.chapter.results.slice(0, 30)"
                  :key="idx"
                  class="result-item chapter-item"
                  :class="{ 'is-selected': idx === 0 }"
                >
                  <span class="chapter-index">{{ idx + 1 }}.</span>
                  <span class="chapter-name">{{ item.name }}</span>
                </div>
                <div v-if="result.chapter.results.length > 30" class="more-hint">
                  + {{ result.chapter.results.length - 30 }} 个更多章节
                </div>
              </div>
            </template>
            <template v-else-if="result.chapter.status === 'error'">
              <t-result theme="error" :title="result.chapter.error" />
            </template>
            <template v-else-if="result.chapter.status === 'running'">
              <div class="loading-state">
                <t-loading size="32px" />
                <span>正在获取章节...</span>
              </div>
            </template>
            <template v-else>
              <div class="loading-state">
                <span>{{
                  result.search.status === 'error' ? '搜索失败，无法获取章节' : '等待测试'
                }}</span>
              </div>
            </template>
          </div>
        </t-tab-panel>

        <t-tab-panel value="content" :label="contentLabel">
          <div class="tab-content">
            <template v-if="result.content.status === 'success'">
              <div class="content-preview">
                <p v-for="(line, idx) in result.content.content.slice(0, 10)" :key="idx">
                  {{ line }}
                </p>
                <div v-if="result.content.content.length > 10" class="more-hint">
                  + {{ result.content.content.length - 10 }} 段更多内容
                </div>
              </div>
            </template>
            <template v-else-if="result.content.status === 'error'">
              <t-result theme="error" :title="result.content.error" />
            </template>
            <template v-else-if="result.content.status === 'running'">
              <div class="loading-state">
                <t-loading size="32px" />
                <span>正在获取正文...</span>
              </div>
            </template>
            <template v-else>
              <div class="loading-state">
                <span>{{
                  result.chapter.status === 'error' ? '章节获取失败，无法获取正文' : '等待测试'
                }}</span>
              </div>
            </template>
          </div>
        </t-tab-panel>

        <t-tab-panel value="discover" :label="discoverLabel" :disabled="!result.hasDiscover">
          <div class="tab-content">
            <template v-if="result.discover.status === 'skipped'">
              <div class="loading-state">
                <span>未配置发现规则</span>
              </div>
            </template>
            <template v-else-if="result.discover.status === 'success'">
              <div class="discover-content">
                <div class="category-groups">
                  <t-tag
                    v-for="(group, idx) in result.discover.groups.slice(0, 10)"
                    :key="idx"
                    size="medium"
                    variant="outline"
                  >
                    {{ group.name }} ({{ group.items.length }})
                  </t-tag>
                  <t-tag v-if="result.discover.groups.length > 10" size="medium" variant="light">
                    +{{ result.discover.groups.length - 10 }}
                  </t-tag>
                </div>
                <div class="result-list" style="margin-top: 12px">
                  <div
                    v-for="(item, idx) in result.discover.results.slice(0, 10)"
                    :key="idx"
                    class="result-item"
                  >
                    <div class="item-name">{{ item.name }}</div>
                    <div class="item-meta">{{ item.author || '' }}</div>
                  </div>
                  <div v-if="result.discover.results.length > 10" class="more-hint">
                    + {{ result.discover.results.length - 10 }} 条更多结果
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="result.discover.status === 'error'">
              <t-result theme="error" :title="result.discover.error" />
            </template>
            <template v-else-if="result.discover.status === 'running'">
              <div class="loading-state">
                <t-loading size="32px" />
                <span>正在加载发现...</span>
              </div>
            </template>
            <template v-else>
              <div class="loading-state">
                <span>等待测试</span>
              </div>
            </template>
          </div>
        </t-tab-panel>
      </t-tabs>
    </template>
    <template v-else>
      <t-empty description="选择左侧书源查看详细结果" />
    </template>
  </div>
</template>

<style scoped>
.detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.detail-header {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.step-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.step-tabs :deep(.t-tabs__nav) {
  margin-bottom: 8px;
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border);
}

.step-tabs :deep(.t-tabs__nav-item) {
  padding: 10px 12px;
  border-radius: 10px 10px 0 0;
}

.step-tabs :deep(.t-tabs__nav-item.is-active) {
  background: var(--color-bg-1);
}

.step-tabs :deep(.t-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow-y: auto;
  padding: 12px;
  background: var(--color-bg-1);
  border-radius: 10px;
  border: 1px solid var(--color-border);
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

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  padding: 12px;
  background: var(--color-bg-3);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.result-item.is-selected {
  background: rgba(22, 93, 255, 0.1);
  border-left: 3px solid var(--color-primary);
}

.item-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.item-meta {
  font-size: 12px;
  color: var(--color-text-3);
}

.item-url {
  font-size: 11px;
  color: var(--color-text-4);
  word-break: break-all;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.chapter-index {
  color: var(--color-text-3);
  font-size: 12px;
  min-width: 28px;
}

.chapter-name {
  flex: 1;
}

.content-preview {
  line-height: 1.8;
  color: var(--color-text-2);
  background: var(--color-bg-3);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
}

.content-preview p {
  margin: 0 0 12px 0;
  text-indent: 2em;
}

.more-hint {
  text-align: center;
  padding: 12px;
  color: var(--color-text-3);
  font-size: 13px;
}

.category-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.discover-content {
  display: flex;
  flex-direction: column;
}
</style>
