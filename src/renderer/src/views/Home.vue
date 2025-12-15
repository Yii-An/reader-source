<!--
  @file Home.vue - 应用主页面
  @description 书源调试器的主界面组件，采用四栏布局：
               - 左侧：书源列表面板（可拖动调整宽度）
               - 中间：规则编辑器（自适应剩余空间）
               - 右侧：测试面板（可拖动调整宽度）
               - 底部：日志面板（可拖动调整高度，可折叠）

               主要功能：
               1. 书源的新建、保存、导入、导出、删除、清空
               2. 布局状态持久化（localStorage）
               3. 面板尺寸拖动调整
               4. 响应式窗口大小适应
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSourceStore, type ExportFormat } from '../stores/sourceStore'
import { useLogStore } from '../stores/logStore'
import type { UniversalRule } from '../types/universal'
import { createDefaultUniversalRule } from '../types/universal'

// ==================== 子组件导入 ====================
import SourceList from '../components/SourceList.vue' // 书源列表组件
import SourceEditor from '../components/source-editor/SourceEditor.vue' // 规则编辑器
import TestPanel from '../components/test-panel/TestPanel.vue' // 测试面板
import LogPanel from '../components/LogPanel.vue' // 日志面板
import Resizer from '../components/Resizer.vue' // 可拖动分隔器

// ==================== Store 实例 ====================
const router = useRouter()
const sourceStore = useSourceStore() // 书源数据管理
const logStore = useLogStore() // 日志管理

// ==================== 布局配置常量 ====================
/** localStorage 中布局配置的存储键名 */
const LAYOUT_STORAGE_KEY = 'reader-source-layout'

/** 面板默认尺寸（像素） */
const DEFAULT_LEFT_WIDTH = 260 // 左侧书源列表默认宽度
const DEFAULT_RIGHT_WIDTH = 320 // 右侧测试面板默认宽度
const DEFAULT_BOTTOM_HEIGHT = 200 // 底部日志面板默认高度

/** 面板尺寸限制（像素） */
const MIN_LEFT_WIDTH = 200 // 左侧面板最小宽度
const MAX_LEFT_WIDTH = 500 // 左侧面板最大宽度
const MIN_RIGHT_WIDTH = 280 // 右侧面板最小宽度
const MAX_RIGHT_WIDTH = 600 // 右侧面板最大宽度
const MIN_BOTTOM_HEIGHT = 100 // 底部面板最小高度
const MAX_BOTTOM_HEIGHT = 500 // 底部面板最大高度

// ==================== 面板尺寸状态 ====================
/** 左侧书源列表面板当前宽度 */
const leftPanelWidth = ref(DEFAULT_LEFT_WIDTH)
/** 右侧测试面板当前宽度 */
const rightPanelWidth = ref(DEFAULT_RIGHT_WIDTH)
/** 底部日志面板当前高度 */
const bottomPanelHeight = ref(DEFAULT_BOTTOM_HEIGHT)
/** 底部面板是否折叠 */
const bottomPanelCollapsed = ref(false)

// ==================== 编辑器状态 ====================
/** 当前正在编辑的书源规则（深拷贝，避免直接修改列表数据） */
const currentRule = ref<UniversalRule>(createDefaultUniversalRule())
/** 当前规则是否有未保存的更改 */
const hasChanges = ref(false)

// ==================== 模态框状态 ====================
/** 导入模态框可见性 */
const importModalVisible = ref(false)
/** 导入文本框内容（粘贴的 JSON） */
const importText = ref('')
/** 导出模态框可见性 */
const exportModalVisible = ref(false)
/** 导出格式选择 */
const exportFormat = ref<ExportFormat>('any-reader')

// ==================== 布局持久化函数 ====================

/**
 * 从 localStorage 加载布局配置
 * @description 读取保存的面板尺寸和折叠状态，恢复用户上次的布局偏好
 * @returns {void}
 */
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

/**
 * 将当前布局配置保存到 localStorage
 * @description 持久化面板尺寸和折叠状态，下次打开应用时恢复
 * @returns {void}
 */
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

// ==================== 面板拖动处理函数 ====================

/**
 * 将数值限制在指定范围内
 * @param {number} value - 要限制的数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的数值
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 处理左侧面板拖动调整
 * @param {number} delta - 鼠标移动的像素差值（正值向右，负值向左）
 * @returns {void}
 */
function handleLeftResize(delta: number): void {
  leftPanelWidth.value = clamp(leftPanelWidth.value + delta, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH)
}

/**
 * 处理右侧面板拖动调整
 * @param {number} delta - 鼠标移动的像素差值（注意：delta 取反，因为向左拖动应增加宽度）
 * @returns {void}
 */
function handleRightResize(delta: number): void {
  rightPanelWidth.value = clamp(rightPanelWidth.value - delta, MIN_RIGHT_WIDTH, MAX_RIGHT_WIDTH)
}

/**
 * 处理底部面板拖动调整
 * @param {number} delta - 鼠标移动的像素差值（注意：delta 取反，因为向上拖动应增加高度）
 * @returns {void}
 */
function handleBottomResize(delta: number): void {
  bottomPanelHeight.value = clamp(
    bottomPanelHeight.value - delta,
    MIN_BOTTOM_HEIGHT,
    MAX_BOTTOM_HEIGHT
  )
}

/**
 * 拖动结束时保存布局
 * @description 用户完成拖动后将新的布局配置持久化
 * @returns {void}
 */
function handleResizeEnd(): void {
  saveLayout()
}

/**
 * 处理窗口大小变化
 * @description 当浏览器窗口调整大小时，确保面板尺寸不超出窗口范围
 * @returns {void}
 */
function handleWindowResize(): void {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // 限制面板宽度不超过窗口宽度的 30%
  leftPanelWidth.value = Math.min(leftPanelWidth.value, windowWidth * 0.3)
  rightPanelWidth.value = Math.min(rightPanelWidth.value, windowWidth * 0.3)
  // 限制底部面板高度不超过窗口高度的 40%
  bottomPanelHeight.value = Math.min(bottomPanelHeight.value, windowHeight * 0.4)
}

// ==================== 生命周期钩子 ====================

/**
 * 组件挂载时初始化
 * @description 1. 从 IndexedDB 加载书源列表
 *              2. 从 localStorage 恢复布局配置
 *              3. 注册窗口大小变化监听
 *              4. 自动选中第一个书源（如果有）
 */
onMounted(async () => {
  await sourceStore.loadSources()
  loadLayout()
  window.addEventListener('resize', handleWindowResize)

  // 如果有历史书源，自动选中第一个进入编辑状态
  if (sourceStore.sources.length > 0) {
    handleSelectSource(sourceStore.sources[0])
  }
})

/**
 * 组件卸载时清理
 * @description 移除窗口大小变化监听器，避免内存泄漏
 */
onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
})

// ==================== 书源操作函数 ====================

/**
 * 处理书源选中事件
 * @description 从列表中选中一个书源加载到编辑器，使用深拷贝避免直接修改原数据
 * @param {UniversalRule} source - 选中的书源规则对象
 * @returns {void}
 */
function handleSelectSource(source: UniversalRule): void {
  currentRule.value = JSON.parse(JSON.stringify(source))
  hasChanges.value = false
  logStore.info(`已加载书源「${source.name}」`)
}

/**
 * 处理新建书源
 * @description 创建一个默认的空白书源规则，并标记为有未保存更改
 * @returns {void}
 */
function handleCreateSource(): void {
  currentRule.value = createDefaultUniversalRule()
  hasChanges.value = true
}

/**
 * 处理规则变更事件
 * @description 接收编辑器的规则更新，并标记为有未保存更改
 * @param {UniversalRule} rule - 更新后的规则对象
 * @returns {void}
 */
function handleRuleChange(rule: UniversalRule): void {
  currentRule.value = rule
  hasChanges.value = true
}

/**
 * 保存当前书源到 IndexedDB
 * @description 将当前编辑的规则序列化后保存，成功后清除未保存标记
 * @returns {Promise<void>}
 * @throws {Error} 保存失败时记录错误日志
 */
async function handleSaveSource(): Promise<void> {
  try {
    logStore.info(`正在保存书源「${currentRule.value.name}」...`)
    // 序列化为纯对象，移除 Vue 响应式代理
    const plainRule = JSON.parse(JSON.stringify(currentRule.value))
    await sourceStore.saveSource(plainRule)
    hasChanges.value = false
    logStore.info(`书源「${currentRule.value.name}」已成功保存`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`保存失败: ${message}`)
  }
}

/**
 * 删除指定书源
 * @description 从 IndexedDB 中删除书源，如果删除的是当前编辑的书源则重置编辑器
 * @param {UniversalRule} source - 要删除的书源规则对象
 * @returns {Promise<void>}
 */
async function handleDeleteSource(source: UniversalRule): Promise<void> {
  await sourceStore.deleteSource(source.id)
  // 如果删除的是当前正在编辑的书源，重置为空白状态
  if (currentRule.value.id === source.id) {
    currentRule.value = createDefaultUniversalRule()
  }
  logStore.info(`已删除书源「${source.name}」`)
}

/**
 * 处理书源导入
 * @description 解析用户粘贴的 JSON 文本，自动识别 any-reader 或 Legado 格式并转换导入
 *              支持单个对象或数组批量导入
 * @returns {Promise<void>}
 * @throws {Error} JSON 解析失败或格式不支持时记录错误日志
 */
async function handleImport(): Promise<void> {
  try {
    const result = await sourceStore.importSources(importText.value)

    if (result.success > 0) {
      const formatLabel = result.format === 'legado' ? 'Legado' : 'any-reader'
      logStore.info(`成功导入 ${result.success} 个书源（格式: ${formatLabel}）`)
    }

    if (result.failed > 0) {
      logStore.warn(`${result.failed} 个书源导入失败`)
      // 最多显示前 3 条错误信息，避免日志刷屏
      result.errors.slice(0, 3).forEach((err) => logStore.error(err))
    }

    // 导入成功后关闭模态框并清空输入
    if (result.success > 0) {
      importModalVisible.value = false
      importText.value = ''
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logStore.error(`导入失败: ${message}`)
  }
}

/**
 * 处理书源导出
 * @description 将所有书源转换为指定格式的 JSON 并触发文件下载
 *              文件名格式：rules[_legado]_{timestamp}.json
 * @returns {void}
 */
function handleExport(): void {
  const json = sourceStore.exportSources(exportFormat.value)

  // 创建 Blob 对象并触发下载
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const formatSuffix = exportFormat.value === 'legado' ? '_legado' : ''
  a.download = `rules${formatSuffix}_${Date.now()}.json`
  a.click()

  // 清理临时 URL
  URL.revokeObjectURL(url)
  exportModalVisible.value = false
  logStore.info(`已导出 ${sourceStore.sourceCount} 个书源（格式: ${exportFormat.value}）`)
}

/**
 * 清空所有书源数据
 * @description 删除 IndexedDB 中所有书源记录，并重置编辑器状态
 *              此操作不可恢复，UI 层有二次确认
 * @returns {Promise<void>}
 */
async function handleClearAll(): Promise<void> {
  const count = await sourceStore.clearAllSources()
  currentRule.value = createDefaultUniversalRule()
  hasChanges.value = false
  logStore.info(`已清除 ${count} 个书源`)
}

/**
 * 切换底部日志面板的折叠/展开状态
 * @description 折叠时隐藏日志面板，仅显示展开按钮；展开时恢复原有高度
 * @returns {void}
 */
function toggleBottomPanel(): void {
  bottomPanelCollapsed.value = !bottomPanelCollapsed.value
  saveLayout()
}

/**
 * 打开批量测试页面
 */
function openBatchTest(): void {
  router.push('/batch-test')
}
</script>

<template>
  <div class="home-layout">
    <!-- 顶部工具栏 -->
    <div class="app-header">
      <div class="header-left">
        <a-button-group size="small">
          <a-button @click="handleCreateSource"> <icon-plus /> 新建 </a-button>
          <a-button @click="handleSaveSource"> <icon-save /> 保存 </a-button>
          <a-button @click="importModalVisible = true"> <icon-download /> 导入 </a-button>
          <a-button @click="exportModalVisible = true"> <icon-upload /> 导出 </a-button>
          <a-popconfirm content="确定要清除所有书源数据吗？此操作不可恢复！" @ok="handleClearAll">
            <a-button status="danger"> <icon-delete /> 清除 </a-button>
          </a-popconfirm>
        </a-button-group>
        <a-divider direction="vertical" style="margin: 0 12px" />
        <a-button size="small" type="primary" @click="openBatchTest">
          <icon-thunderbolt /> 批量测试
        </a-button>
      </div>
      <div class="header-right">
        <span class="app-title">
          书源调试器
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

    <!-- 底部日志面板（通栏） -->
    <div
      v-if="!bottomPanelCollapsed"
      class="bottom-panel"
      :style="{ height: bottomPanelHeight + 'px' }"
    >
      <LogPanel :logs="logStore.logs" @clear="logStore.clearLogs" @collapse="toggleBottomPanel" />
    </div>

    <!-- 折叠状态的展开按钮 -->
    <div v-else class="log-collapsed" @click="toggleBottomPanel"><icon-up /> 显示日志</div>
  </div>

  <!-- 导入模态框 -->
  <a-modal v-model:visible="importModalVisible" title="导入书源" @ok="handleImport">
    <a-alert type="info" style="margin-bottom: 12px">
      支持 any-reader 和 Legado 格式，自动识别并转换
    </a-alert>
    <a-textarea
      v-model="importText"
      placeholder="粘贴书源 JSON..."
      :auto-size="{ minRows: 8, maxRows: 20 }"
      style="max-height: 400px; overflow-y: auto"
    />
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  padding: 12px 16px;
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
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

/* 主体区域：横向 flex 布局 */
.main-area {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 左侧书源列表 */
.left-panel {
  flex-shrink: 0;
  background: var(--color-bg-1);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 中间编辑器：自适应剩余空间 */
.center-panel {
  flex: 1;
  min-width: 400px;
  overflow: hidden;
  background: var(--color-bg-2);
  display: flex;
  flex-direction: column;
}

/* 右侧测试面板 */
.right-panel {
  flex-shrink: 0;
  background: var(--color-bg-1);
  border-left: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 底部日志面板：通栏 */
.bottom-panel {
  flex-shrink: 0;
  width: 100%;
  background: var(--color-bg-3);
  border-top: 1px solid var(--color-border);
  overflow: hidden;
}

/* 日志折叠按钮 */
.log-collapsed {
  flex-shrink: 0;
  padding: 8px 16px;
  background: var(--color-bg-2);
  border-top: 1px solid var(--color-border);
  cursor: pointer;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-3);
  transition: all 0.2s;
  user-select: none;
}

.log-collapsed:hover {
  background: var(--color-bg-3);
  color: var(--color-text-1);
}
</style>
