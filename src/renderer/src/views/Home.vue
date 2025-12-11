<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSourceStore } from '../stores/sourceStore'
import { useLogStore } from '../stores/logStore'
import type { Rule } from '../types'
import { createDefaultRule } from '../types'

// 组件
import SourceList from '../components/SourceList.vue'
import SourceEditor from '../components/SourceEditor.vue'
import TestPanel from '../components/TestPanel.vue'
import LogPanel from '../components/LogPanel.vue'

const sourceStore = useSourceStore()
const logStore = useLogStore()

// 面板状态
const bottomPanelCollapsed = ref(false)

// 当前编辑的书源
const currentRule = ref<Rule>(createDefaultRule())
const hasChanges = ref(false)

// 导入模态框
const importModalVisible = ref(false)
const importText = ref('')

// 初始化
onMounted(() => {
  sourceStore.loadSources()
})

// 书源操作
function handleSelectSource(source: Rule): void {
  currentRule.value = JSON.parse(JSON.stringify(source))
  hasChanges.value = false
  logStore.info(`已加载书源「${source.name}」`)
}

function handleCreateSource(): void {
  currentRule.value = createDefaultRule()
  hasChanges.value = true
}

function handleRuleChange(rule: Rule): void {
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

async function handleDeleteSource(source: Rule): Promise<void> {
  await sourceStore.deleteSource(source.id)
  if (currentRule.value.id === source.id) {
    currentRule.value = createDefaultRule()
  }
  logStore.info(`已删除书源「${source.name}」`)
}

async function handleImport(): Promise<void> {
  try {
    const count = await sourceStore.importSources(importText.value)
    logStore.info(`成功导入 ${count} 个书源`)
    importModalVisible.value = false
    importText.value = ''
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`导入失败: ${message}`)
  }
}

function handleExport(): void {
  const json = sourceStore.exportSources()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rules_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <a-layout class="home-layout">
    <!-- 顶部工具栏 -->
    <a-layout-header class="app-header">
      <div class="header-left">
        <a-button-group size="small">
          <a-button @click="handleCreateSource">
            <icon-plus /> 新建
          </a-button>
          <a-button @click="handleSaveSource">
            <icon-save /> 保存
          </a-button>
          <a-button @click="importModalVisible = true">
            <icon-upload /> 导入
          </a-button>
          <a-button @click="handleExport">
            <icon-download /> 导出
          </a-button>
        </a-button-group>
      </div>
      <div class="header-right">
        <span class="app-title">
          书源调试器
          <span v-if="hasChanges" class="unsaved-badge">未保存</span>
        </span>
      </div>
    </a-layout-header>

    <a-layout class="main-layout">
      <!-- 左侧书源列表 -->
      <a-layout-sider :width="260" class="source-panel">
        <SourceList
          :sources="sourceStore.filteredSources"
          :current-id="currentRule.id"
          :search-query="sourceStore.searchQuery"
          @select="handleSelectSource"
          @delete="handleDeleteSource"
          @update:search-query="sourceStore.searchQuery = $event"
        />
      </a-layout-sider>

      <!-- 中间编辑区 -->
      <a-layout class="center-layout">
        <a-layout-content class="editor-content">
          <SourceEditor
            :rule="currentRule"
            @update:rule="handleRuleChange"
          />
        </a-layout-content>

        <!-- 底部日志面板 -->
        <LogPanel
          v-if="!bottomPanelCollapsed"
          :logs="logStore.logs"
          @clear="logStore.clearLogs"
          @collapse="bottomPanelCollapsed = true"
        />
        <div v-else class="log-collapsed" @click="bottomPanelCollapsed = false">
          <icon-up /> 显示日志
        </div>
      </a-layout>

      <!-- 右侧测试面板 -->
      <a-layout-sider :width="320" class="test-panel">
        <TestPanel :rule="currentRule" />
      </a-layout-sider>
    </a-layout>
  </a-layout>

  <!-- 导入模态框 -->
  <a-modal v-model:visible="importModalVisible" title="导入书源" @ok="handleImport">
    <a-textarea v-model="importText" placeholder="粘贴书源 JSON..." :auto-size="{ minRows: 8 }" />
  </a-modal>
</template>

<style scoped>
.home-layout {
  height: 100vh;
}

.main-layout {
  flex: 1;
  overflow: hidden;
}

.center-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

.app-title {
  font-size: 14px;
  font-weight: 500;
}

.unsaved-badge {
  color: var(--color-warning);
  font-size: 12px;
  margin-left: 8px;
}

.log-collapsed {
  padding: 8px 16px;
  background: var(--color-bg-2);
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-3);
}

.log-collapsed:hover {
  color: var(--color-text-1);
}
</style>
