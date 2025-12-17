<script setup lang="ts">
import { computed } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import { UniversalContentType, UniversalContentTypeLabels } from '../../../types/universal'

const props = defineProps<{
  rule: UniversalRule
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalRule]
}>()

const contentTypeOptions = computed(() =>
  Object.entries(UniversalContentTypeLabels).map(([value, label]) => ({
    value: value as UniversalContentType,
    label
  }))
)

function updateField<K extends keyof UniversalRule>(field: K, value: UniversalRule[K]): void {
  emit('update:rule', { ...props.rule, [field]: value })
}
</script>

<template>
  <div class="basic-info-form">
    <t-form-item label="书源名称 (name)">
      <t-input
        :value="rule.name"
        placeholder="输入书源名称"
        @change="updateField('name', $event as string)"
      />
    </t-form-item>
    <t-form-item label="域名 (host)">
      <t-input
        :value="rule.host"
        placeholder="https://example.com"
        @change="updateField('host', $event as string)"
      />
    </t-form-item>
    <t-form-item label="内容类型 (contentType)">
      <t-select
        :value="rule.contentType"
        :options="contentTypeOptions"
        @change="updateField('contentType', $event as UniversalContentType)"
      />
    </t-form-item>
    <t-form-item label="启用 (enabled)">
      <t-switch :value="rule.enabled" @change="updateField('enabled', $event as boolean)" />
    </t-form-item>
    <t-form-item label="图标 (icon)">
      <t-input
        :value="rule.icon"
        placeholder="图标 URL（可选）"
        @change="updateField('icon', $event as string)"
      />
    </t-form-item>
    <t-form-item label="作者 (author)">
      <t-input
        :value="rule.author"
        placeholder="规则作者（可选）"
        @change="updateField('author', $event as string)"
      />
    </t-form-item>
    <t-form-item label="分组 (group)">
      <t-input
        :value="rule.group"
        placeholder="规则分组（可选）"
        @change="updateField('group', $event as string)"
      />
    </t-form-item>
    <t-form-item label="排序权重 (sort)">
      <t-input-number
        :value="rule.sort"
        placeholder="数字越小越靠前"
        @change="updateField('sort', $event as number)"
      />
    </t-form-item>
    <t-form-item label="备注说明 (comment)">
      <t-textarea
        :value="rule.comment"
        placeholder="规则说明（可选）"
        :autosize="{ minRows: 2 }"
        @change="updateField('comment', $event as string)"
      />
    </t-form-item>
    <t-form-item label="User-Agent (userAgent)">
      <t-input
        :value="rule.userAgent"
        placeholder="自定义 User-Agent（可选）"
        @change="updateField('userAgent', $event as string)"
      />
    </t-form-item>
    <t-form-item label="全局 JS 脚本 (loadJs)">
      <t-textarea
        :value="rule.loadJs"
        placeholder="页面加载时执行的 JS 脚本（可选）"
        :autosize="{ minRows: 2 }"
        @change="updateField('loadJs', $event as string)"
      />
    </t-form-item>
    <t-form-item label="JS 函数库 (jsLib)">
      <t-textarea
        :value="rule.jsLib"
        placeholder="复杂规则共用的 JS 函数（可选）"
        :autosize="{ minRows: 3 }"
        @change="updateField('jsLib', $event as string)"
      />
    </t-form-item>
  </div>
</template>
