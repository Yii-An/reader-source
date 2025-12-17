<script setup lang="ts">
import type { UniversalDiscoverRule } from '../../../types/universal'

const props = defineProps<{
  rule: UniversalDiscoverRule | undefined
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalDiscoverRule]
}>()

function updateField<K extends keyof UniversalDiscoverRule>(
  field: K,
  value: UniversalDiscoverRule[K]
): void {
  if (!props.rule) return
  emit('update:rule', { ...props.rule, [field]: value })
}
</script>

<template>
  <div v-if="rule" class="discover-rule-form">
    <t-form-item label="启用发现页 (enabled)">
      <t-switch :value="rule.enabled" @change="updateField('enabled', $event as boolean)" />
    </t-form-item>
    <t-form-item label="发现URL (url)">
      <t-textarea
        :value="rule.url"
        placeholder="分类::URL格式，或 @js: 动态规则"
        :autosize="{ minRows: 3 }"
        @change="updateField('url', $event as string)"
      />
    </t-form-item>
    <t-form-item label="列表规则 (list)">
      <t-input
        :value="rule.list"
        placeholder="@css: 或 @xpath: 选择器"
        @change="updateField('list', $event as string)"
      />
    </t-form-item>
    <t-form-item label="名称规则 (name)">
      <t-input
        :value="rule.name"
        placeholder="@css:.name@text"
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
    <t-form-item label="标签规则 (tags)">
      <t-input
        :value="rule.tags"
        placeholder="@css:.tags@text"
        @change="updateField('tags', $event as string)"
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
    <t-form-item label="结果URL规则 (result)">
      <t-input
        :value="rule.result"
        placeholder="@css:a@href"
        @change="updateField('result', $event as string)"
      />
    </t-form-item>
    <t-form-item label="下一页URL规则 (nextUrl)">
      <t-input
        :value="rule.nextUrl"
        placeholder="下一页 URL 选择器"
        @change="updateField('nextUrl', $event as string)"
      />
    </t-form-item>
  </div>
</template>
