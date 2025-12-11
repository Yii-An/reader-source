<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Rule } from '../types'
import { ContentTypeLabels } from '../types'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps<{
  rule: Rule
}>()

const emit = defineEmits<{
  'update:rule': [rule: Rule]
}>()

const editorMode = ref<'code' | 'form'>('code')
const codeValue = ref('')
const isUpdatingCode = ref(false)

// 内容类型选项
const contentTypeOptions = computed(() =>
  Object.entries(ContentTypeLabels).map(([value, label]) => ({
    value: Number(value),
    label
  }))
)

// 初始化代码值
watch(
  () => props.rule,
  (newRule) => {
    if (!isUpdatingCode.value) {
      isUpdatingCode.value = true
      codeValue.value = JSON.stringify(newRule, null, 2)
      setTimeout(() => {
        isUpdatingCode.value = false
      }, 100)
    }
  },
  { immediate: true, deep: true }
)

function handleCodeChange(value: string): void {
  if (isUpdatingCode.value) return
  codeValue.value = value
  try {
    const parsed = JSON.parse(value)
    if (parsed.id && parsed.name) {
      emit('update:rule', parsed)
    }
  } catch {
    // 忽略无效 JSON
  }
}

function handleFormChange(): void {
  emit('update:rule', { ...props.rule })
}
</script>

<template>
  <div class="editor-container">
    <div class="editor-toolbar">
      <a-radio-group v-model="editorMode" type="button" size="small">
        <a-radio value="code">代码</a-radio>
        <a-radio value="form">表单</a-radio>
      </a-radio-group>
      <span class="editor-info">
        {{ rule.name }} - {{ rule.host || '未设置' }}
      </span>
    </div>

    <!-- 代码模式 -->
    <div v-show="editorMode === 'code'" class="code-editor">
      <MonacoEditor
        :value="codeValue"
        language="json"
        @change="handleCodeChange"
      />
    </div>

    <!-- 表单模式 -->
    <div v-show="editorMode === 'form'" class="form-editor">
      <a-form :model="rule" layout="vertical" @change="handleFormChange">
        <a-collapse :default-active-key="['basic', 'search']">
          <a-collapse-item key="basic" header="基本信息">
            <a-form-item label="书源名称">
              <a-input v-model="rule.name" placeholder="输入书源名称" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="域名 (host)">
              <a-input v-model="rule.host" placeholder="https://example.com" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="内容类型">
              <a-select v-model="rule.contentType" :options="contentTypeOptions" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="User-Agent">
              <a-input v-model="rule.userAgent" placeholder="自定义 User-Agent（可选）" @change="handleFormChange" />
            </a-form-item>
          </a-collapse-item>

          <a-collapse-item key="search" header="搜索规则">
            <a-form-item label="搜索URL">
              <a-input v-model="rule.searchUrl" placeholder="$keyword 为搜索关键词, $page 为页码" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="搜索列表规则">
              <a-input v-model="rule.searchList" placeholder="CSS选择器" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="标题规则">
              <a-input v-model="rule.searchName" placeholder="@text 或 CSS选择器@attr" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="封面规则">
              <a-input v-model="rule.searchCover" placeholder="img@src" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="作者规则">
              <a-input v-model="rule.searchAuthor" placeholder="CSS选择器@text" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="结果URL规则">
              <a-input v-model="rule.searchResult" placeholder="a@href" @change="handleFormChange" />
            </a-form-item>
          </a-collapse-item>

          <a-collapse-item key="chapter" header="章节规则">
            <a-form-item label="章节页URL">
              <a-input v-model="rule.chapterUrl" placeholder="$result 为上一步结果" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="章节列表规则">
              <a-input v-model="rule.chapterList" placeholder="CSS选择器" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="章节名规则">
              <a-input v-model="rule.chapterName" placeholder="@text" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="章节URL规则">
              <a-input v-model="rule.chapterResult" placeholder="a@href" @change="handleFormChange" />
            </a-form-item>
          </a-collapse-item>

          <a-collapse-item key="content" header="正文规则">
            <a-form-item label="正文页URL">
              <a-input v-model="rule.contentUrl" placeholder="$result 为上一步结果" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="正文内容规则">
              <a-input v-model="rule.contentItems" placeholder="CSS选择器" @change="handleFormChange" />
            </a-form-item>
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

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-2);
  flex-shrink: 0;
}

.editor-info {
  color: var(--color-text-3);
  font-size: 12px;
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
