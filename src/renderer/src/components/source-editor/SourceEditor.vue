<!--
  @file SourceEditor.vue - 书源规则编辑器
  @description 书源规则的核心编辑组件，支持两种编辑模式：
               1. 代码模式 (code)：使用 Monaco 编辑器直接编辑 JSON
               2. 表单模式 (form)：通过可折叠的表单分组编辑各项规则

               数据流设计：
               - props.rule（父组件传入）→ localRule（本地副本）→ emit('update:rule')
               - 使用深拷贝隔离数据，避免直接修改 props
               - 通过标志位防止 watch 循环触发

               平台适配：
               - 根据 _meta.sourceFormat 自动识别规则来源（any-reader/legado）
               - 自动初始化平台特有的子对象结构
-->
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type {
  UniversalRule,
  UniversalSearchRule,
  UniversalDetailRule,
  UniversalChapterRule,
  UniversalDiscoverRule,
  UniversalContentRule
} from '../../types/universal'

// ==================== 子组件导入 ====================
import MonacoEditor from '../MonacoEditor.vue' // VS Code 风格代码编辑器
import EditorToolbar from './EditorToolbar.vue' // 编辑器顶部工具栏
import BasicInfoForm from './forms/BasicInfoForm.vue' // 基本信息表单
import SearchRuleForm from './forms/SearchRuleForm.vue' // 搜索规则表单
import DetailRuleForm from './forms/DetailRuleForm.vue' // 详情页规则表单
import ChapterRuleForm from './forms/ChapterRuleForm.vue' // 章节规则表单
import DiscoverRuleForm from './forms/DiscoverRuleForm.vue' // 发现页规则表单
import ContentRuleForm from './forms/ContentRuleForm.vue' // 正文规则表单

// ==================== Props 定义 ====================
/**
 * @property {UniversalRule} rule - 父组件传入的书源规则对象
 */
const props = defineProps<{
  rule: UniversalRule
}>()

// ==================== Emits 定义 ====================
/**
 * @event update:rule - 规则更新事件，用于 v-model:rule 双向绑定
 * @param {UniversalRule} rule - 更新后的规则对象
 */
const emit = defineEmits<{
  'update:rule': [rule: UniversalRule]
}>()

// ==================== 编辑器状态 ====================
/** 当前编辑模式：'code' 代码模式 | 'form' 表单模式 */
const editorMode = ref<'code' | 'form'>('code')
/** Monaco 编辑器中的 JSON 文本内容 */
const codeValue = ref('')
/** 标志位：正在更新代码内容，用于防止代码变更时的循环触发 */
const isUpdatingCode = ref(false)

// ==================== 平台标签状态 ====================
/**
 * 各规则区块的平台标签选择状态
 * @description 控制每个规则表单中显示哪个平台的特有字段
 *              例如 any-reader 的 filterRule 或 legado 的 bookSourceType
 */
const platformTabs = ref({
  basic: 'any-reader' as 'any-reader' | 'legado',
  search: 'any-reader' as 'any-reader' | 'legado',
  chapter: 'any-reader' as 'any-reader' | 'legado',
  discover: 'any-reader' as 'any-reader' | 'legado',
  content: 'any-reader' as 'any-reader' | 'legado'
})

// ==================== 本地规则副本 ====================
/**
 * 本地可变的规则副本
 * @description 使用深拷贝创建，避免直接修改 props.rule
 *              所有编辑操作都在 localRule 上进行，然后通过 emit 同步到父组件
 */
const localRule = ref<UniversalRule>(JSON.parse(JSON.stringify(props.rule)))

/**
 * 标志位：本次更新来自本地修改
 * @description 用于区分 props.rule 的变化是来自父组件还是本组件 emit 后的回传
 *              避免 watch 循环触发
 */
const isLocalUpdate = ref(false)

/**
 * 标志位：正在初始化
 * @description 当从父组件接收新规则进行初始化时为 true
 *              初始化期间不应触发 emit，只更新本地状态
 */
const isInitializing = ref(false)

// ==================== Watch 监听器 ====================

/**
 * 监听 props.rule 变化，同步到 localRule
 * @description 当父组件传入新的规则时（如用户选择了另一个书源）：
 *              1. 检查是否是本地更新的回传，如果是则跳过
 *              2. 标记为初始化状态
 *              3. 深拷贝新规则到 localRule
 *              4. 更新代码编辑器内容
 *              5. 根据规则来源更新平台标签
 *              6. 初始化完成后允许 emit
 */
watch(
  () => props.rule,
  (newRule) => {
    // 如果是本地更新后父组件回传的，跳过处理
    if (isLocalUpdate.value) {
      isLocalUpdate.value = false
      return
    }
    // 标记为初始化状态，避免触发 update:rule
    isInitializing.value = true
    localRule.value = JSON.parse(JSON.stringify(newRule))
    updateCodeValue(newRule)
    updateActivePlatform(newRule)
    // 使用 nextTick 确保所有更新完成后再允许 emit
    nextTick(() => {
      isInitializing.value = false
    })
  },
  { deep: true }
)

/**
 * 监听 localRule 变化，emit 到父组件
 * @description 当本地规则发生变化时：
 *              1. 初始化期间只更新代码显示，不 emit
 *              2. 正常编辑时设置标志位并 emit 到父组件
 *              3. 同步更新代码编辑器内容
 */
watch(
  localRule,
  (newVal) => {
    // 初始化过程中不 emit，只更新代码显示
    if (isInitializing.value) {
      updateCodeValue(newVal)
      return
    }
    isLocalUpdate.value = true
    emit('update:rule', newVal)
    updateCodeValue(newVal)
  },
  { deep: true }
)

// ==================== 平台相关函数 ====================

/**
 * 根据规则来源更新平台标签状态
 * @description 根据 _meta.sourceFormat 判断规则来源，并：
 *              1. 将所有区块的平台标签设置为对应平台
 *              2. 初始化该平台特有的子对象结构
 * @param {UniversalRule} rule - 规则对象
 * @returns {void}
 */
function updateActivePlatform(rule: UniversalRule): void {
  // 根据元数据判断规则来源平台
  const platform = rule._meta?.sourceFormat === 'legado' ? 'legado' : 'any-reader'

  // 统一设置所有区块的平台标签
  platformTabs.value = {
    basic: platform,
    search: platform,
    chapter: platform,
    discover: platform,
    content: platform
  }

  // 初始化平台特有的子对象，确保表单绑定时不会报错
  if (platform === 'any-reader') {
    // any-reader 平台特有字段
    if (localRule.value.search && !localRule.value.search.anyReader) {
      localRule.value.search.anyReader = {}
    }
    if (localRule.value.chapter && !localRule.value.chapter.anyReader) {
      localRule.value.chapter.anyReader = {}
    }
    if (localRule.value.discover && !localRule.value.discover.anyReader) {
      localRule.value.discover.anyReader = {}
    }
    if (!localRule.value.anyReader) {
      localRule.value.anyReader = {}
    }
  } else if (platform === 'legado') {
    // Legado 平台特有字段
    if (localRule.value.content && !localRule.value.content.legado) {
      localRule.value.content.legado = {}
    }
    if (!localRule.value.legado) {
      localRule.value.legado = {}
    }
  }
}

// ==================== 代码编辑器相关函数 ====================

/**
 * 更新代码编辑器的内容
 * @description 将规则对象格式化为 JSON 字符串显示在编辑器中
 *              使用 isUpdatingCode 标志位防止触发 handleCodeChange
 * @param {UniversalRule} rule - 规则对象
 * @returns {void}
 */
function updateCodeValue(rule: UniversalRule): void {
  if (!isUpdatingCode.value) {
    isUpdatingCode.value = true
    codeValue.value = JSON.stringify(rule, null, 2)
    // 延迟重置标志位，确保 Monaco 的 change 事件已处理完毕
    setTimeout(() => {
      isUpdatingCode.value = false
    }, 100)
  }
}

/**
 * 处理代码编辑器内容变化
 * @description 用户在 Monaco 编辑器中修改 JSON 时触发：
 *              1. 忽略程序触发的更新
 *              2. 尝试解析 JSON，如果有效且包含必要字段则更新 localRule
 *              3. 无效 JSON 静默忽略，不影响编辑体验
 * @param {string} value - 编辑器中的 JSON 文本
 * @returns {void}
 */
function handleCodeChange(value: string): void {
  // 忽略程序触发的更新
  if (isUpdatingCode.value) return
  codeValue.value = value
  try {
    const parsed = JSON.parse(value)
    // 基本验证：必须包含 id 和 name
    if (parsed.id && parsed.name) {
      localRule.value = parsed
    }
  } catch {
    // JSON 解析失败时静默忽略，允许用户继续编辑
  }
}

// ==================== 嵌套对象初始化函数 ====================
// 这些函数确保在展开折叠面板时，对应的嵌套对象已存在，避免表单绑定报错

/**
 * 确保搜索规则对象存在
 * @description 在展开搜索规则面板时调用，初始化搜索规则结构
 * @returns {void}
 */
function ensureSearch(): void {
  if (!localRule.value.search) {
    localRule.value.search = { enabled: true, url: '', list: '', name: '', result: '' }
  }
  if (platformTabs.value.search === 'any-reader' && !localRule.value.search.anyReader) {
    localRule.value.search.anyReader = {}
  }
}

/**
 * 确保章节规则对象存在
 * @description 在展开章节规则面板时调用
 * @returns {void}
 */
function ensureChapter(): void {
  if (!localRule.value.chapter) {
    localRule.value.chapter = { list: '', name: '', result: '' }
  }
  if (platformTabs.value.chapter === 'any-reader' && !localRule.value.chapter.anyReader) {
    localRule.value.chapter.anyReader = {}
  }
}

/**
 * 确保正文规则对象存在
 * @description 在展开正文规则面板时调用
 * @returns {void}
 */
function ensureContent(): void {
  if (!localRule.value.content) {
    localRule.value.content = { items: '' }
  }
  if (platformTabs.value.content === 'legado' && !localRule.value.content.legado) {
    localRule.value.content.legado = {}
  }
}

/**
 * 确保详情规则对象存在
 * @description 在展开详情规则面板时调用
 * @returns {void}
 */
function ensureDetail(): void {
  if (!localRule.value.detail) {
    localRule.value.detail = { enabled: false }
  }
}

/**
 * 确保发现规则对象存在
 * @description 在展开发现规则面板时调用
 * @returns {void}
 */
function ensureDiscover(): void {
  if (!localRule.value.discover) {
    localRule.value.discover = { enabled: false, url: '', list: '', name: '', result: '' }
  }
  if (platformTabs.value.discover === 'any-reader' && !localRule.value.discover.anyReader) {
    localRule.value.discover.anyReader = {}
  }
}

// ==================== 子表单更新处理函数 ====================
// 这些函数接收子表单组件的更新事件，并合并到 localRule

/**
 * 处理基本信息表单更新
 * @description 基本信息表单直接更新整个规则对象（因为包含顶层字段）
 * @param {UniversalRule} rule - 更新后的规则对象
 * @returns {void}
 */
function handleBasicUpdate(rule: UniversalRule): void {
  localRule.value = rule
}

/**
 * 处理搜索规则表单更新
 * @param {UniversalSearchRule} rule - 更新后的搜索规则
 * @returns {void}
 */
function handleSearchUpdate(rule: UniversalSearchRule): void {
  localRule.value = { ...localRule.value, search: rule }
}

/**
 * 处理详情规则表单更新
 * @param {UniversalDetailRule} rule - 更新后的详情规则
 * @returns {void}
 */
function handleDetailUpdate(rule: UniversalDetailRule): void {
  localRule.value = { ...localRule.value, detail: rule }
}

/**
 * 处理章节规则表单更新
 * @param {UniversalChapterRule} rule - 更新后的章节规则
 * @returns {void}
 */
function handleChapterUpdate(rule: UniversalChapterRule): void {
  localRule.value = { ...localRule.value, chapter: rule }
}

/**
 * 处理发现规则表单更新
 * @param {UniversalDiscoverRule} rule - 更新后的发现规则
 * @returns {void}
 */
function handleDiscoverUpdate(rule: UniversalDiscoverRule): void {
  localRule.value = { ...localRule.value, discover: rule }
}

/**
 * 处理正文规则表单更新
 * @param {UniversalContentRule} rule - 更新后的正文规则
 * @returns {void}
 */
function handleContentUpdate(rule: UniversalContentRule): void {
  localRule.value = { ...localRule.value, content: rule }
}
</script>

<template>
  <div class="editor-container">
    <EditorToolbar
      :mode="editorMode"
      :rule-name="localRule.name"
      :rule-host="localRule.host || ''"
      :source-format="localRule._meta?.sourceFormat"
      @update:mode="editorMode = $event"
    />

    <!-- Code mode -->
    <div v-show="editorMode === 'code'" class="code-editor">
      <MonacoEditor :value="codeValue" language="json" @change="handleCodeChange" />
    </div>

    <!-- Form mode -->
    <div v-show="editorMode === 'form'" class="form-editor">
      <a-form :model="localRule" layout="vertical"
        ><a-collapse :default-active-key="['basic', 'search']">
          <!-- Basic Info -->
          <a-collapse-item key="basic" header="基本信息">
            <BasicInfoForm
              :rule="localRule"
              :platform-tab="platformTabs.basic"
              @update:rule="handleBasicUpdate"
              @update:platform-tab="platformTabs.basic = $event"
            />
          </a-collapse-item>

          <!-- Search Rule -->
          <a-collapse-item key="search" header="搜索规则" @click="ensureSearch">
            <SearchRuleForm
              :rule="localRule.search"
              :platform-tab="platformTabs.search"
              @update:rule="handleSearchUpdate"
              @update:platform-tab="platformTabs.search = $event"
            />
          </a-collapse-item>

          <!-- Detail Rule -->
          <a-collapse-item key="detail" header="详情页规则" @click="ensureDetail">
            <DetailRuleForm :rule="localRule.detail" @update:rule="handleDetailUpdate" />
          </a-collapse-item>

          <!-- Chapter Rule -->
          <a-collapse-item key="chapter" header="章节/目录规则" @click="ensureChapter">
            <ChapterRuleForm
              :rule="localRule.chapter"
              :platform-tab="platformTabs.chapter"
              @update:rule="handleChapterUpdate"
              @update:platform-tab="platformTabs.chapter = $event"
            />
          </a-collapse-item>

          <!-- Discover Rule -->
          <a-collapse-item key="discover" header="发现页规则" @click="ensureDiscover">
            <DiscoverRuleForm
              :rule="localRule.discover"
              :platform-tab="platformTabs.discover"
              @update:rule="handleDiscoverUpdate"
              @update:platform-tab="platformTabs.discover = $event"
            />
          </a-collapse-item>

          <!-- Content Rule -->
          <a-collapse-item key="content" header="正文规则" @click="ensureContent">
            <ContentRuleForm
              :rule="localRule.content"
              :platform-tab="platformTabs.content"
              @update:rule="handleContentUpdate"
              @update:platform-tab="platformTabs.content = $event"
            />
          </a-collapse-item>
        </a-collapse>
      </a-form>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.code-editor {
  flex: 1;
  overflow: hidden;
  min-height: 300px;
}

.form-editor {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
