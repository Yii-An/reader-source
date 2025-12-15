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
    <a-form-item label="启用详情页">
      <a-switch
        :model-value="rule.enabled"
        @update:model-value="updateField('enabled', $event as boolean)"
      />
    </a-form-item>
    <a-form-item label="详情页URL">
      <a-input
        :model-value="rule.url"
        placeholder="详情页 URL 模板（可选）"
        @update:model-value="updateField('url', $event as string)"
      />
    </a-form-item>
    <a-form-item label="预处理规则">
      <a-textarea
        :model-value="rule.init"
        placeholder="预处理规则"
        :auto-size="{ minRows: 2 }"
        @update:model-value="updateField('init', $event as string)"
      />
    </a-form-item>
    <a-form-item label="书名规则">
      <a-input
        :model-value="rule.name"
        placeholder="@css:.book-name@text"
        @update:model-value="updateField('name', $event as string)"
      />
    </a-form-item>
    <a-form-item label="作者规则">
      <a-input
        :model-value="rule.author"
        placeholder="@css:.author@text"
        @update:model-value="updateField('author', $event as string)"
      />
    </a-form-item>
    <a-form-item label="封面规则">
      <a-input
        :model-value="rule.cover"
        placeholder="@css:img@src"
        @update:model-value="updateField('cover', $event as string)"
      />
    </a-form-item>
    <a-form-item label="简介规则">
      <a-input
        :model-value="rule.description"
        placeholder="@css:.intro@text"
        @update:model-value="updateField('description', $event as string)"
      />
    </a-form-item>
    <a-form-item label="最新章节规则">
      <a-input
        :model-value="rule.latestChapter"
        placeholder="@css:.latest@text"
        @update:model-value="updateField('latestChapter', $event as string)"
      />
    </a-form-item>
    <a-form-item label="字数规则">
      <a-input
        :model-value="rule.wordCount"
        placeholder="@css:.word-count@text"
        @update:model-value="updateField('wordCount', $event as string)"
      />
    </a-form-item>
    <a-form-item label="标签规则">
      <a-input
        :model-value="rule.tags"
        placeholder="@css:.tags@text"
        @update:model-value="updateField('tags', $event as string)"
      />
    </a-form-item>
    <a-form-item label="目录URL规则">
      <a-input
        :model-value="rule.tocUrl"
        placeholder="@css:.toc-link@href"
        @update:model-value="updateField('tocUrl', $event as string)"
      />
    </a-form-item>
    <a-form-item label="允许修改书名作者">
      <a-switch
        :model-value="rule.canRename"
        @update:model-value="updateField('canRename', $event as boolean)"
      />
    </a-form-item>
  </div>
</template>
