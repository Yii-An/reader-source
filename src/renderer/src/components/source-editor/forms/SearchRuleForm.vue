<script setup lang="ts">
import type { UniversalSearchRule } from '../../../types/universal'

const props = defineProps<{
  rule: UniversalSearchRule | undefined
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalSearchRule]
}>()

function updateField<K extends keyof UniversalSearchRule>(
  field: K,
  value: UniversalSearchRule[K]
): void {
  if (!props.rule) return
  emit('update:rule', { ...props.rule, [field]: value })
}
</script>

<template>
  <div v-if="rule" class="search-rule-form">
    <t-form-item label="启用搜索 (enabled)">
      <t-switch :value="rule.enabled" @change="updateField('enabled', $event as boolean)" />
    </t-form-item>
    <t-form-item label="搜索URL (url)">
      <t-input
        :value="rule.url"
        placeholder="{{keyword}} 为搜索关键词, {{page}} 为页码"
        @change="updateField('url', $event as string)"
      />
    </t-form-item>
    <t-form-item label="搜索列表规则 (list)">
      <t-input
        :value="rule.list"
        placeholder="@css: 或 @xpath: 选择器"
        @change="updateField('list', $event as string)"
      />
    </t-form-item>
    <t-form-item label="标题规则 (name)">
      <t-input
        :value="rule.name"
        placeholder="@css:.title@text"
        @change="updateField('name', $event as string)"
      />
    </t-form-item>
    <t-form-item label="封面规则 (cover)">
      <t-input
        :value="rule.cover"
        placeholder="@css:img@src"
        @change="updateField('cover', $event as string)"
      />
    </t-form-item>
    <t-form-item label="作者规则 (author)">
      <t-input
        :value="rule.author"
        placeholder="@css:.author@text"
        @change="updateField('author', $event as string)"
      />
    </t-form-item>
    <t-form-item label="描述规则 (description)">
      <t-input
        :value="rule.description"
        placeholder="@css:.intro@text"
        @change="updateField('description', $event as string)"
      />
    </t-form-item>
    <t-form-item label="最新章节规则 (latestChapter)">
      <t-input
        :value="rule.latestChapter"
        placeholder="@css:.latest@text"
        @change="updateField('latestChapter', $event as string)"
      />
    </t-form-item>
    <t-form-item label="字数规则 (wordCount)">
      <t-input
        :value="rule.wordCount"
        placeholder="@css:.word-count@text"
        @change="updateField('wordCount', $event as string)"
      />
    </t-form-item>
    <t-form-item label="标签规则 (tags)">
      <t-input
        :value="rule.tags"
        placeholder="@css:.tags@text"
        @change="updateField('tags', $event as string)"
      />
    </t-form-item>
    <t-form-item label="结果URL规则 (result)">
      <t-input
        :value="rule.result"
        placeholder="@css:a@href"
        @change="updateField('result', $event as string)"
      />
    </t-form-item>
  </div>
</template>
