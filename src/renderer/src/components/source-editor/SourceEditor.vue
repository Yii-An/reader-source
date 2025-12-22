<!--
  @file SourceEditor.vue - 书源规则编辑器
  @description 书源规则编辑组件，支持代码模式和表单模式
-->
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type {
  UniversalRule,
  UniversalSearchRule,
  UniversalChapterRule,
  UniversalDiscoverRule,
  UniversalContentRule
} from '../../types/universal'

import MonacoEditor from '../MonacoEditor.vue'
import EditorToolbar from './EditorToolbar.vue'
import BasicInfoForm from './forms/BasicInfoForm.vue'
import SearchRuleForm from './forms/SearchRuleForm.vue'
import ChapterRuleForm from './forms/ChapterRuleForm.vue'
import DiscoverRuleForm from './forms/DiscoverRuleForm.vue'
import ContentRuleForm from './forms/ContentRuleForm.vue'

const props = defineProps<{
  rule: UniversalRule
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalRule]
}>()

const editorMode = ref<'code' | 'form'>('code')
const codeValue = ref('')
const isUpdatingCode = ref(false)

const localRule = ref<UniversalRule>(JSON.parse(JSON.stringify(props.rule)))
const isLocalUpdate = ref(false)
const isInitializing = ref(false)

watch(
  () => props.rule,
  (newRule) => {
    if (isLocalUpdate.value) {
      isLocalUpdate.value = false
      return
    }
    isInitializing.value = true
    localRule.value = JSON.parse(JSON.stringify(newRule))
    updateCodeValue(newRule)
    nextTick(() => {
      isInitializing.value = false
    })
  },
  { deep: true }
)

watch(
  localRule,
  (newVal) => {
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

function updateCodeValue(rule: UniversalRule): void {
  if (!isUpdatingCode.value) {
    isUpdatingCode.value = true
    codeValue.value = JSON.stringify(rule, null, 2)
    setTimeout(() => {
      isUpdatingCode.value = false
    }, 100)
  }
}

function handleCodeChange(value: string): void {
  if (isUpdatingCode.value) return
  codeValue.value = value
  try {
    const parsed = JSON.parse(value)
    if (parsed.id && parsed.name) {
      localRule.value = parsed
    }
  } catch {
    // JSON parsing error, ignore
  }
}

function ensureSearch(): void {
  if (!localRule.value.search) {
    localRule.value.search = { enabled: true, url: '', list: '', name: '', result: '' }
  }
}

function ensureChapter(): void {
  if (!localRule.value.chapter) {
    localRule.value.chapter = { list: '', name: '', result: '' }
  }
}

function ensureContent(): void {
  if (!localRule.value.content) {
    localRule.value.content = { items: '' }
  }
}

function ensureDiscover(): void {
  if (!localRule.value.discover) {
    localRule.value.discover = { enabled: false, url: '', list: '', name: '', result: '' }
  }
}

function handleBasicUpdate(rule: UniversalRule): void {
  localRule.value = rule
}

function handleSearchUpdate(rule: UniversalSearchRule): void {
  localRule.value = { ...localRule.value, search: rule }
}

function handleChapterUpdate(rule: UniversalChapterRule): void {
  localRule.value = { ...localRule.value, chapter: rule }
}

function handleDiscoverUpdate(rule: UniversalDiscoverRule): void {
  localRule.value = { ...localRule.value, discover: rule }
}

function handleContentUpdate(rule: UniversalContentRule): void {
  localRule.value = { ...localRule.value, content: rule }
}
</script>

<template>
  <div class="editor-container">
    <EditorToolbar
      :mode="editorMode"
      :source-format="localRule._meta?.sourceFormat"
      @update:mode="editorMode = $event"
    />

    <div v-show="editorMode === 'code'" class="code-editor">
      <MonacoEditor :value="codeValue" language="json" @change="handleCodeChange" />
    </div>

    <div v-show="editorMode === 'form'" class="form-editor">
      <t-form :data="localRule" layout="vertical" label-align="top">
        <t-collapse :default-expand-all="false" :default-value="['basic', 'search']">
          <t-collapse-panel value="basic" header="基本信息">
            <BasicInfoForm :rule="localRule" @update:rule="handleBasicUpdate" />
          </t-collapse-panel>

          <t-collapse-panel value="search" header="搜索规则" @click="ensureSearch">
            <SearchRuleForm :rule="localRule.search" @update:rule="handleSearchUpdate" />
          </t-collapse-panel>

          <t-collapse-panel value="chapter" header="章节/目录规则" @click="ensureChapter">
            <ChapterRuleForm :rule="localRule.chapter" @update:rule="handleChapterUpdate" />
          </t-collapse-panel>

          <t-collapse-panel value="discover" header="发现页规则" @click="ensureDiscover">
            <DiscoverRuleForm :rule="localRule.discover" @update:rule="handleDiscoverUpdate" />
          </t-collapse-panel>

          <t-collapse-panel value="content" header="正文规则" @click="ensureContent">
            <ContentRuleForm :rule="localRule.content" @update:rule="handleContentUpdate" />
          </t-collapse-panel>
        </t-collapse>
      </t-form>
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
