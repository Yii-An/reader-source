<script setup lang="ts">
import type { UniversalContentRule } from '../../../types/universal'

const props = defineProps<{
  rule: UniversalContentRule | undefined
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalContentRule]
}>()

function updateField<K extends keyof UniversalContentRule>(
  field: K,
  value: UniversalContentRule[K]
): void {
  if (!props.rule) return
  emit('update:rule', { ...props.rule, [field]: value })
}
</script>

<template>
  <div v-if="rule" class="content-rule-form">
    <t-form-item label="正文页URL (url)">
      <t-input
        :value="rule.url"
        placeholder="{{result}} 为上一步结果"
        @change="updateField('url', $event as string)"
      />
    </t-form-item>
    <t-form-item label="正文内容规则 (items)">
      <t-textarea
        :value="rule.items"
        placeholder="@css:.content@text 或 @js: 规则"
        :autosize="{ minRows: 3 }"
        @change="updateField('items', $event as string)"
      />
    </t-form-item>
    <t-form-item label="下一页URL (nextUrl)">
      <t-input
        :value="rule.nextUrl"
        placeholder="翻页规则（可选）"
        @change="updateField('nextUrl', $event as string)"
      />
    </t-form-item>
  </div>
</template>
