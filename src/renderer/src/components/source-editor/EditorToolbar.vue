<script setup lang="ts">
defineProps<{
  mode: 'code' | 'form'
  ruleName: string
  ruleHost: string
  sourceFormat?: string
}>()

const emit = defineEmits<{
  'update:mode': [mode: 'code' | 'form']
}>()
</script>

<template>
  <div class="editor-toolbar">
    <a-radio-group
      :model-value="mode"
      type="button"
      size="small"
      @update:model-value="emit('update:mode', $event as 'code' | 'form')"
    >
      <a-radio value="code">代码</a-radio>
      <a-radio value="form">表单</a-radio> </a-radio-group
    ><span class="editor-info">
      {{ ruleName }} - {{ ruleHost || '未设置' }}
      <a-tag v-if="sourceFormat" size="small" color="arcoblue">
        {{ sourceFormat }}
      </a-tag>
    </span>
  </div>
</template>

<style scoped>
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
</style>
