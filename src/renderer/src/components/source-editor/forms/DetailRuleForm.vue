<script setup lang="ts">
import type { UniversalDetailRule } from '../../../types/universal'

const props = defineProps<{
  rule: UniversalDetailRule | undefined
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalDetailRule]
}>()

function updateField<K extends keyof UniversalDetailRule>(
  field: K,
  value: UniversalDetailRule[K]
): void {
  if (!props.rule) return
  emit('update:rule', { ...props.rule, [field]: value })
}
</script>

<template>
  <div v-if="rule" class="detail-rule-form">
    <t-form-item label="启用详情页 (enabled)">
      <t-switch :value="rule.enabled" @change="updateField('enabled', $event as boolean)" />
    </t-form-item>
    <t-form-item label="详情页URL (url)">
      <t-input
        :value="rule.url"
        placeholder="详情页 URL 模板（可选）"
        @change="updateField('url', $event as string)"
      />
    </t-form-item>
    <t-form-item label="预处理规则 (init)">
      <t-textarea
        :value="rule.init"
        placeholder="预处理规则"
        :autosize="{ minRows: 2 }"
        @change="updateField('init', $event as string)"
      />
    </t-form-item>
    <t-form-item label="书名规则 (name)">
      <t-input
        :value="rule.name"
        placeholder="@css:.book-name@text"
        @change="updateField('name', $event as string)"
      />
    </t-form-item>
    <t-form-item label="作者规则 (author)">
      <t-input
        :value="rule.author"
        placeholder="@css:.author@text"
        @change="updateField('author', $event as string)"
      />
    </t-form-item>
    <t-form-item label="封面规则 (cover)">
      <t-input
        :value="rule.cover"
        placeholder="@css:img@src"
        @change="updateField('cover', $event as string)"
      />
    </t-form-item>
    <t-form-item label="简介规则 (description)">
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
    <t-form-item label="目录URL规则 (tocUrl)">
      <t-input
        :value="rule.tocUrl"
        placeholder="@css:.toc-link@href"
        @change="updateField('tocUrl', $event as string)"
      />
    </t-form-item>
    <t-form-item label="允许修改书名作者 (canRename)">
      <t-switch :value="rule.canRename" @change="updateField('canRename', $event as boolean)" />
    </t-form-item>
  </div>
</template>
