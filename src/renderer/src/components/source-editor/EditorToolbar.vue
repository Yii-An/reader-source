<script setup lang="ts">
defineProps<{
  mode: 'code' | 'form'
  sourceFormat?: string
}>()

const emit = defineEmits<{
  'update:mode': [mode: 'code' | 'form']
}>()
</script>

<template>
  <div class="editor-toolbar">
    <t-radio-group
      :value="mode"
      variant="default-filled"
      size="medium"
      @change="emit('update:mode', $event as 'code' | 'form')"
    >
      <t-radio-button value="code">代码</t-radio-button>
      <t-radio-button value="form">表单</t-radio-button>
    </t-radio-group>
    <span class="editor-info">
      <t-tag v-if="sourceFormat" size="medium" theme="primary">
        {{ sourceFormat }}
      </t-tag>
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
