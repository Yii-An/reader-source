<!--
  @file Home.vue - 书源编辑器主页面
  @description 书源调试器主界面，采用四栏布局
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  AddIcon,
  SaveIcon,
  DeleteIcon,
  FlashlightIcon,
  ChevronUpIcon,
  ViewListIcon,
  RefreshIcon
} from 'tdesign-icons-vue-next'
import { useSourceStore } from '../stores/sourceStore'
import { useLogStore } from '../stores/logStore'
import type { UniversalRule } from '../types/universal'
import { createDefaultUniversalRule } from '../types/universal'

import SourceList from '../components/SourceList.vue'
import SourceEditor from '../components/source-editor/SourceEditor.vue'
import TestPanel from '../components/test-panel/TestPanel.vue'
import LogPanel from '../components/LogPanel.vue'
import Resizer from '../components/Resizer.vue'

const router = useRouter()
const sourceStore = useSourceStore()
const logStore = useLogStore()

const LAYOUT_STORAGE_KEY = 'reader-source-layout'
const DEFAULT_LEFT_WIDTH = 260
const DEFAULT_RIGHT_WIDTH = 320
const DEFAULT_BOTTOM_HEIGHT = 200
const MIN_LEFT_WIDTH = 200
const MAX_LEFT_WIDTH = 500
const MIN_RIGHT_WIDTH = 280
const MAX_RIGHT_WIDTH = 600
const MIN_BOTTOM_HEIGHT = 100
const MAX_BOTTOM_HEIGHT = 500

const leftPanelWidth = ref(DEFAULT_LEFT_WIDTH)
const rightPanelWidth = ref(DEFAULT_RIGHT_WIDTH)
const bottomPanelHeight = ref(DEFAULT_BOTTOM_HEIGHT)
const bottomPanelCollapsed = ref(false)
const showLogViewer = ref(false)
const fileLogContent = ref('')
const fileLogLoading = ref(false)
type RendererBridge = Window & {
  api?: {
    readLog?: () => Promise<string>
  }
  electron?: {
    ipcRenderer?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}

const canReadFileLog = computed(() => {
  const w = window as RendererBridge
  return (
    typeof w.api?.readLog === 'function' || typeof w.electron?.ipcRenderer?.invoke === 'function'
  )
})

const currentRule = ref<UniversalRule>(createDefaultUniversalRule())
const hasChanges = ref(false)

function loadLayout(): void {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (saved) {
      const layout = JSON.parse(saved)
      leftPanelWidth.value = layout.leftPanelWidth || DEFAULT_LEFT_WIDTH
      rightPanelWidth.value = layout.rightPanelWidth || DEFAULT_RIGHT_WIDTH
      bottomPanelHeight.value = layout.bottomPanelHeight || DEFAULT_BOTTOM_HEIGHT
      bottomPanelCollapsed.value = layout.bottomPanelCollapsed || false
    }
  } catch (error) {
    console.error('Failed to load layout:', error)
  }
}

function saveLayout(): void {
  try {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        leftPanelWidth: leftPanelWidth.value,
        rightPanelWidth: rightPanelWidth.value,
        bottomPanelHeight: bottomPanelHeight.value,
        bottomPanelCollapsed: bottomPanelCollapsed.value
      })
    )
  } catch (error) {
    console.error('Failed to save layout:', error)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function handleLeftResize(delta: number): void {
  leftPanelWidth.value = clamp(leftPanelWidth.value + delta, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH)
}

function handleRightResize(delta: number): void {
  rightPanelWidth.value = clamp(rightPanelWidth.value - delta, MIN_RIGHT_WIDTH, MAX_RIGHT_WIDTH)
}

function handleBottomResize(delta: number): void {
  bottomPanelHeight.value = clamp(
    bottomPanelHeight.value - delta,
    MIN_BOTTOM_HEIGHT,
    MAX_BOTTOM_HEIGHT
  )
}

function handleResizeEnd(): void {
  saveLayout()
}

function handleWindowResize(): void {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  leftPanelWidth.value = Math.min(leftPanelWidth.value, windowWidth * 0.3)
  rightPanelWidth.value = Math.min(rightPanelWidth.value, windowWidth * 0.3)
  bottomPanelHeight.value = Math.min(bottomPanelHeight.value, windowHeight * 0.4)
}

onMounted(async () => {
  await sourceStore.loadSources()
  loadLayout()
  window.addEventListener('resize', handleWindowResize)
  if (sourceStore.sources.length > 0) {
    handleSelectSource(sourceStore.sources[0])
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
})

function handleSelectSource(source: UniversalRule): void {
  currentRule.value = JSON.parse(JSON.stringify(source))
  hasChanges.value = false
  logStore.info(`已加载书源「${source.name}」`)
}

function handleCreateSource(): void {
  currentRule.value = createDefaultUniversalRule()
  hasChanges.value = true
}

function handleRuleChange(rule: UniversalRule): void {
  currentRule.value = rule
  hasChanges.value = true
}

async function handleSaveSource(): Promise<void> {
  try {
    logStore.info(`正在保存书源「${currentRule.value.name}」...`)
    const plainRule = JSON.parse(JSON.stringify(currentRule.value))
    await sourceStore.saveSource(plainRule)
    hasChanges.value = false
    logStore.info(`书源「${currentRule.value.name}」已成功保存`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`保存失败: ${message}`)
  }
}

async function handleDeleteSource(source: UniversalRule): Promise<void> {
  await sourceStore.deleteSource(source.id)
  if (currentRule.value.id === source.id) {
    currentRule.value = createDefaultUniversalRule()
  }
  logStore.info(`已删除书源「${source.name}」`)
}

async function handleClearAll(): Promise<void> {
  const count = await sourceStore.clearAllSources()
  currentRule.value = createDefaultUniversalRule()
  hasChanges.value = false
  logStore.info(`已清除 ${count} 个书源`)
}

function toggleBottomPanel(): void {
  bottomPanelCollapsed.value = !bottomPanelCollapsed.value
  saveLayout()
}

function openBatchTest(): void {
  router.push('/batch-test')
}

async function openLogViewer(): Promise<void> {
  showLogViewer.value = true
  await loadFileLog()
}

async function loadFileLog(): Promise<void> {
  try {
    fileLogLoading.value = true
    const w = window as RendererBridge
    const apiRead = w.api?.readLog
    const content =
      typeof apiRead === 'function'
        ? await apiRead()
        : w.electron?.ipcRenderer?.invoke
          ? await w.electron.ipcRenderer.invoke('log:read')
          : ''
    if (!content && !apiRead && !w.electron?.ipcRenderer?.invoke) {
      fileLogContent.value = '当前环境不支持读取日志文件'
      return
    }
    if (typeof content !== 'string') {
      fileLogContent.value = String(content)
      return
    }
    fileLogContent.value = content || '暂无日志内容'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fileLogContent.value = `读取日志失败: ${message}`
  } finally {
    fileLogLoading.value = false
  }
}
</script>

<template>
  <div class="home-layout">
    <!-- 顶部工具栏 -->
    <div class="app-header">
      <div class="header-left">
        <t-space size="medium">
          <t-button size="medium" @click="handleCreateSource">
            <template #icon><add-icon /></template>
            新建
          </t-button>
          <t-button size="medium" @click="handleSaveSource">
            <template #icon><save-icon /></template>
            保存
          </t-button>
          <t-popconfirm
            content="确定要清除所有书源数据吗？此操作不可恢复！"
            @confirm="handleClearAll"
          >
            <t-button size="medium" theme="danger">
              <template #icon><delete-icon /></template>
              清除
            </t-button>
          </t-popconfirm>
        </t-space>
        <t-divider layout="vertical" style="margin: 0 12px" />
        <t-button size="medium" theme="primary" @click="openBatchTest">
          <template #icon><flashlight-icon /></template>
          批量测试
        </t-button>
        <t-button
          size="medium"
          variant="outline"
          :disabled="!canReadFileLog"
          @click="openLogViewer"
        >
          <template #icon><view-list-icon /></template>
          查看日志
        </t-button>
      </div>
      <div class="header-right">
        <span class="app-title">
          书源编辑器
          <span v-if="hasChanges" class="unsaved-badge">未保存</span>
        </span>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="main-area">
      <!-- 左侧书源列表 -->
      <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
        <SourceList
          :sources="sourceStore.filteredSources"
          :current-id="currentRule.id"
          :search-query="sourceStore.searchQuery"
          @select="handleSelectSource"
          @delete="handleDeleteSource"
          @update:search-query="sourceStore.searchQuery = $event"
        />
      </div>

      <!-- 左侧分隔器 -->
      <Resizer
        direction="vertical"
        :min-size="MIN_LEFT_WIDTH"
        :max-size="MAX_LEFT_WIDTH"
        @resize="handleLeftResize"
        @resize-end="handleResizeEnd"
      />

      <!-- 中间编辑器 -->
      <div class="center-panel">
        <SourceEditor :rule="currentRule" @update:rule="handleRuleChange" />
      </div>

      <!-- 右侧分隔器 -->
      <Resizer
        direction="vertical"
        :min-size="MIN_RIGHT_WIDTH"
        :max-size="MAX_RIGHT_WIDTH"
        @resize="handleRightResize"
        @resize-end="handleResizeEnd"
      />

      <!-- 右侧测试面板 -->
      <div class="right-panel" :style="{ width: rightPanelWidth + 'px' }">
        <TestPanel :rule="currentRule" />
      </div>
    </div>

    <!-- 底部分隔器 -->
    <Resizer
      v-if="!bottomPanelCollapsed"
      direction="horizontal"
      :min-size="MIN_BOTTOM_HEIGHT"
      :max-size="MAX_BOTTOM_HEIGHT"
      @resize="handleBottomResize"
      @resize-end="handleResizeEnd"
    />

    <!-- 底部日志面板 -->
    <div
      v-if="!bottomPanelCollapsed"
      class="bottom-panel"
      :style="{ height: bottomPanelHeight + 'px' }"
    >
      <LogPanel :logs="logStore.logs" @clear="logStore.clearLogs" @collapse="toggleBottomPanel" />
    </div>

    <!-- 折叠状态的展开按钮 -->
    <div v-else class="log-collapsed" @click="toggleBottomPanel"><chevron-up-icon /> 显示日志</div>

    <!-- 日志查看弹窗 -->
    <t-dialog
      v-model:visible="showLogViewer"
      header="主进程日志（app-main.log）"
      width="800px"
      :footer="false"
      destroy-on-close
    >
      <div class="file-log-actions">
        <t-button size="small" variant="outline" :loading="fileLogLoading" @click="loadFileLog">
          <template #icon><refresh-icon /></template>
          刷新
        </t-button>
        <span class="file-log-hint">显示最近日志，路径位于 userData/logs</span>
      </div>
      <div class="file-log-viewer">
        <pre>{{ fileLogContent }}</pre>
      </div>
    </t-dialog>
  </div>
</template>

<style scoped>
.home-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  gap: 12px;
  padding: 12px 16px 16px;
  box-sizing: border-box;
  background: var(--color-bg-1);
}

.app-header {
  flex-shrink: 0;
  padding: 12px 16px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 20;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
}

.unsaved-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 146, 0, 0.1);
  color: var(--color-warning);
  font-size: 12px;
  border: 1px solid rgba(255, 146, 0, 0.4);
}

.main-area {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  gap: 12px;
}

.left-panel {
  flex-shrink: 0;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.center-panel {
  flex: 1;
  min-width: 400px;
  overflow: hidden;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex-shrink: 0;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bottom-panel {
  flex-shrink: 0;
  width: 100%;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.log-collapsed {
  flex-shrink: 0;
  padding: 10px 14px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-2);
  transition: all 0.2s;
  user-select: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
}

.log-collapsed:hover {
  background: var(--color-bg-3);
  color: var(--color-text-1);
  transform: translateY(-1px);
}

.file-log-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.file-log-hint {
  font-size: 12px;
  color: var(--color-text-3);
}

.file-log-viewer {
  max-height: 500px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
  font-family: 'Consolas', 'SFMono-Regular', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
