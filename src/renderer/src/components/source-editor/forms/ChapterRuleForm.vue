<script setup lang="ts">
import type { UniversalChapterRule } from '../../../types/universal'

const props = defineProps<{
  rule: UniversalChapterRule | undefined
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalChapterRule]
}>()

function updateField<K extends keyof UniversalChapterRule>(
  field: K,
  value: UniversalChapterRule[K]
): void {
  if (!props.rule) return
  emit('update:rule', { ...props.rule, [field]: value })
}
</script>

<template>
  <div v-if="rule" class="chapter-rule-form">
    <t-form-item label="章节页URL (url)">
      <t-input
        :value="rule.url"
        placeholder="{{result}} 为上一步结果"
        @change="updateField('url', $event as string)"
      />
    </t-form-item>
    <t-form-item label="章节列表规则 (list)">
      <t-input
        :value="rule.list"
        placeholder="@css: 或 @xpath: 选择器"
        @change="updateField('list', $event as string)"
      />
    </t-form-item>
    <t-form-item label="章节名规则 (name)">
      <t-input
        :value="rule.name"
        placeholder="@text"
        @change="updateField('name', $event as string)"
      />
    </t-form-item>
    <t-form-item label="章节封面规则 (cover)">
      <t-input
        :value="rule.cover"
        placeholder="章节封面选择器（可选）"
        @change="updateField('cover', $event as string)"
      />
    </t-form-item>
    <t-form-item label="更新时间规则 (time)">
      <t-input
        :value="rule.time"
        placeholder="更新时间选择器（可选）"
        @change="updateField('time', $event as string)"
      />
    </t-form-item>
    <t-form-item label="章节URL规则 (result)">
      <t-input
        :value="rule.result"
        placeholder="@css:a@href"
        @change="updateField('result', $event as string)"
      />
    </t-form-item>
    <t-form-item label="下一页URL (nextUrl)">
      <t-input
        :value="rule.nextUrl"
        placeholder="翻页规则（可选）"
        @change="updateField('nextUrl', $event as string)"
      />
    </t-form-item>
    <t-form-item label="VIP 标识 (isVip)">
      <t-input
        :value="rule.isVip"
        placeholder="VIP 章节标识（可选）"
        @change="updateField('isVip', $event as string)"
      />
    </t-form-item>
    <t-form-item label="付费标识 (isPay)">
      <t-input
        :value="rule.isPay"
        placeholder="付费章节标识（可选）"
        @change="updateField('isPay', $event as string)"
      />
    </t-form-item>
  </div>
</template>
