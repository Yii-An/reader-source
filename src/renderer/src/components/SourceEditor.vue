<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { UniversalRule } from '../types/universal'
import { UniversalContentType, UniversalContentTypeLabels } from '../types/universal'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps<{
  rule: UniversalRule
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalRule]
}>()

const editorMode = ref<'code' | 'form'>('code')
const codeValue = ref('')
const isUpdatingCode = ref(false)

// 内容类型选项
const contentTypeOptions = computed(() =>
  Object.entries(UniversalContentTypeLabels).map(([value, label]) => ({
    value: value as UniversalContentType,
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

// 确保嵌套对象存在
function ensureSearch(): void {
  if (!props.rule.search) {
    emit('update:rule', {
      ...props.rule,
      search: { enabled: true, url: '', list: '', name: '', result: '' }
    })
  }
}

function ensureChapter(): void {
  if (!props.rule.chapter) {
    emit('update:rule', {
      ...props.rule,
      chapter: { list: '', name: '', result: '' }
    })
  }
}

function ensureContent(): void {
  if (!props.rule.content) {
    emit('update:rule', {
      ...props.rule,
      content: { items: '' }
    })
  }
}

function ensureDetail(): void {
  if (!props.rule.detail) {
    emit('update:rule', {
      ...props.rule,
      detail: { enabled: false }
    })
  }
}

function ensureDiscover(): void {
  if (!props.rule.discover) {
    emit('update:rule', {
      ...props.rule,
      discover: { enabled: false, url: '', list: '', name: '', result: '' }
    })
  }
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
        <a-tag v-if="rule._meta?.sourceFormat" size="small" color="arcoblue">
          {{ rule._meta.sourceFormat }}
        </a-tag>
      </span>
    </div>

    <!-- 代码模式 -->
    <div v-show="editorMode === 'code'" class="code-editor">
      <MonacoEditor :value="codeValue" language="json" @change="handleCodeChange" />
    </div>

    <!-- 表单模式 -->
    <div v-show="editorMode === 'form'" class="form-editor">
      <a-form :model="rule" layout="vertical" @change="handleFormChange">
        <a-collapse :default-active-key="['basic', 'search']">
          <!-- 基本信息 -->
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
            <a-form-item label="分组">
              <a-input v-model="rule.group" placeholder="规则分组（可选）" @change="handleFormChange" />
            </a-form-item>
            <a-form-item label="User-Agent">
              <a-input v-model="rule.userAgent" placeholder="自定义 User-Agent（可选）" @change="handleFormChange" />
            </a-form-item>
          </a-collapse-item>

          <!-- 搜索规则 -->
          <a-collapse-item key="search" header="搜索规则" @click="ensureSearch">
            <template v-if="rule.search">
              <a-form-item label="启用搜索">
                <a-switch v-model="rule.search.enabled" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="搜索URL">
                <a-input
                  v-model="rule.search.url"
                  placeholder="{{keyword}} 为搜索关键词, {{page}} 为页码"
                  @change="handleFormChange"
                />
              </a-form-item>
              <a-form-item label="搜索列表规则">
                <a-input v-model="rule.search.list" placeholder="@css: 或 @xpath: 选择器" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="标题规则">
                <a-input v-model="rule.search.name" placeholder="@css:.title@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="封面规则">
                <a-input v-model="rule.search.cover" placeholder="@css:img@src" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="作者规则">
                <a-input v-model="rule.search.author" placeholder="@css:.author@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="结果URL规则">
                <a-input v-model="rule.search.result" placeholder="@css:a@href" @change="handleFormChange" />
              </a-form-item>
            </template>
          </a-collapse-item>

          <!-- 详情页规则 (Legado 风格) -->
          <a-collapse-item key="detail" header="详情页规则" @click="ensureDetail">
            <template v-if="rule.detail">
              <a-form-item label="启用详情页">
                <a-switch v-model="rule.detail.enabled" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="书名规则">
                <a-input v-model="rule.detail.name" placeholder="@css:.book-name@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="作者规则">
                <a-input v-model="rule.detail.author" placeholder="@css:.author@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="封面规则">
                <a-input v-model="rule.detail.cover" placeholder="@css:img@src" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="简介规则">
                <a-input v-model="rule.detail.description" placeholder="@css:.intro@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="目录URL规则">
                <a-input v-model="rule.detail.tocUrl" placeholder="@css:.toc-link@href" @change="handleFormChange" />
              </a-form-item>
            </template>
          </a-collapse-item>

          <!-- 章节规则 -->
          <a-collapse-item key="chapter" header="章节/目录规则" @click="ensureChapter">
            <template v-if="rule.chapter">
              <a-form-item label="章节页URL">
                <a-input v-model="rule.chapter.url" placeholder="{{result}} 为上一步结果" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="章节列表规则">
                <a-input v-model="rule.chapter.list" placeholder="@css: 或 @xpath: 选择器" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="章节名规则">
                <a-input v-model="rule.chapter.name" placeholder="@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="章节URL规则">
                <a-input v-model="rule.chapter.result" placeholder="@css:a@href" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="下一页URL">
                <a-input v-model="rule.chapter.nextUrl" placeholder="翻页规则（可选）" @change="handleFormChange" />
              </a-form-item>
            </template>
          </a-collapse-item>

          <!-- 发现页规则 -->
          <a-collapse-item key="discover" header="发现页规则" @click="ensureDiscover">
            <template v-if="rule.discover">
              <a-form-item label="启用发现页">
                <a-switch v-model="rule.discover.enabled" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="发现URL">
                <a-input v-model="rule.discover.url" placeholder="分类::URL 格式" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="列表规则">
                <a-input v-model="rule.discover.list" placeholder="@css: 或 @xpath: 选择器" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="名称规则">
                <a-input v-model="rule.discover.name" placeholder="@css:.name@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="结果URL规则">
                <a-input v-model="rule.discover.result" placeholder="@css:a@href" @change="handleFormChange" />
              </a-form-item>
            </template>
          </a-collapse-item>

          <!-- 正文规则 -->
          <a-collapse-item key="content" header="正文规则" @click="ensureContent">
            <template v-if="rule.content">
              <a-form-item label="正文页URL">
                <a-input v-model="rule.content.url" placeholder="{{result}} 为上一步结果" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="正文内容规则">
                <a-input v-model="rule.content.items" placeholder="@css:.content@text" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="下一页URL">
                <a-input v-model="rule.content.nextUrl" placeholder="翻页规则（可选）" @change="handleFormChange" />
              </a-form-item>
              <a-form-item label="使用 WebView">
                <a-switch v-model="rule.content.webView" @change="handleFormChange" />
              </a-form-item>
            </template>
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
  display: flex;
  align-items: center;
  gap: 8px;
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

