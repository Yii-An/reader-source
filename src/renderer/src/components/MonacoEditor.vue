<script setup lang="ts">
import { ref, onMounted, shallowRef, watch, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'
import { universalRuleSchema } from '../schemas/universalRuleSchema'

// 配置 Monaco 的 worker
self.MonacoEnvironment = {
  getWorker: function (_moduleId: string, label: string) {
    if (label === 'json') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
        { type: 'module' }
      )
    }
    // 默认使用通用 editor worker
    return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), {
      type: 'module'
    })
  }
}

// 配置 JSON Schema 验证和智能提示
// 注意：monaco.languages.json 类型标记为 deprecated，但 API 仍可用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonLanguage = (monaco.languages as any).json
if (jsonLanguage?.jsonDefaults) {
  jsonLanguage.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemas: [
      {
        uri: 'https://reader-source/schemas/universal-rule.json',
        fileMatch: ['*'],
        schema: universalRuleSchema
      }
    ],
    enableSchemaRequest: false
  })
}

const props = defineProps<{
  value: string
  language?: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  change: [value: string]
}>()

const containerRef = ref<HTMLElement>()
const editorInstance = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null)
const isUpdating = ref(false)

onMounted(() => {
  if (containerRef.value) {
    // 定义深色主题
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#313244',
        'editorLineNumber.foreground': '#6c7086',
        'editorCursor.foreground': '#f5e0dc'
      }
    })

    // 创建编辑器实例
    editorInstance.value = monaco.editor.create(containerRef.value, {
      value: props.value,
      language: props.language || 'json',
      theme: 'custom-dark',
      readOnly: props.readOnly,
      minimap: { enabled: false },
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "'Fira Code', 'Consolas', monospace",
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      padding: { top: 16, bottom: 16 }
    })

    // 监听内容变化
    editorInstance.value.onDidChangeModelContent(() => {
      if (!isUpdating.value && editorInstance.value) {
        emit('change', editorInstance.value.getValue())
      }
    })
  }
})

// 监听外部值变化
watch(
  () => props.value,
  (newValue) => {
    if (editorInstance.value) {
      const current = editorInstance.value.getValue()
      if (current !== newValue) {
        isUpdating.value = true
        editorInstance.value.setValue(newValue)
        setTimeout(() => {
          isUpdating.value = false
        }, 50)
      }
    }
  }
)

// 清理
onBeforeUnmount(() => {
  if (editorInstance.value) {
    editorInstance.value.dispose()
  }
})
</script>

<template>
  <div ref="containerRef" class="monaco-container"></div>
</template>

<style scoped>
.monaco-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
