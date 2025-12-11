<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSourceStore, type ExportFormat } from '../stores/sourceStore'
import { useLogStore } from '../stores/logStore'
import type { UniversalRule } from '../types/universal'
import { createDefaultUniversalRule } from '../types/universal'

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
const currentRule = ref<UniversalRule>(createDefaultUniversalRule())
const hasChanges = ref(false)

// 导入模态框
const importModalVisible = ref(false)
const importText = ref('')

// 导出模态框
const exportModalVisible = ref(false)
const exportFormat = ref<ExportFormat>('any-reader')

// 初始化
onMounted(() => {
  sourceStore.loadSources()
})

// 书源操作
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

async function handleImport(): Promise<void> {
  try {
    const result = await sourceStore.importSources(importText.value)

    if (result.success > 0) {
      const formatLabel = result.format === 'legado' ? 'Legado' : 'any-reader'
      logStore.info(`成功导入 ${result.success} 个书源（格式: ${formatLabel}）`)
    }

    if (result.failed > 0) {
      logStore.warn(`${result.failed} 个书源导入失败`)
      result.errors.slice(0, 3).forEach((err) => logStore.error(err))
    }

    if (result.success > 0) {
      importModalVisible.value = false
      importText.value = ''
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`导入失败: ${message}`)
  }
}

function handleExport(): void {
  const json = sourceStore.exportSources(exportFormat.value)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const formatSuffix = exportFormat.value === 'legado' ? '_legado' : ''
  a.download = `rules${formatSuffix}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  exportModalVisible.value = false
  logStore.info(`已导出 ${sourceStore.sourceCount} 个书源（格式: ${exportFormat.value}）`)
}

async function handleClearAll(): Promise<void> {
  const count = await sourceStore.clearAllSources()
  currentRule.value = createDefaultUniversalRule()
  hasChanges.value = false
  logStore.info(`已清除 ${count} 个书源`)
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
          <a-button @click="exportModalVisible = true"> <icon-download /> 导出 </a-button>
          <a-popconfirm content="确定要清除所有书源数据吗？此操作不可恢复！" @ok="handleClearAll">
            <a-button status="danger"> <icon-delete /> 清除 </a-button>
          </a-popconfirm>
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
    <a-alert type="info" style="margin-bottom: 12px">
      支持 any-reader 和 Legado 格式，自动识别并转换
    </a-alert>
    <a-textarea v-model="importText" placeholder="粘贴书源 JSON..." :auto-size="{ minRows: 8 }" />
  </a-modal>

  <!-- 导出模态框 -->
  <a-modal v-model:visible="exportModalVisible" title="导出书源" @ok="handleExport">
    <a-form :model="{}" layout="vertical">
      <a-form-item label="导出格式">
        <a-radio-group v-model="exportFormat">
          <a-radio value="any-reader">any-reader 格式</a-radio>
          <a-radio value="legado">Legado 格式</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item>
        <a-alert v-if="exportFormat === 'legado'" type="warning">
          导出为 Legado 格式时，部分 any-reader 特有字段可能不被支持
        </a-alert>
      </a-form-item>
    </a-form>
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
