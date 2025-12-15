<script setup lang="ts">
import type { UniversalDiscoverRule } from '../../../types/universal'
import PlatformConfigSection from '../PlatformConfigSection.vue'

const props = defineProps<{
  rule: UniversalDiscoverRule | undefined
  platformTab: 'any-reader' | 'legado'
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalDiscoverRule]
  'update:platformTab': [tab: 'any-reader' | 'legado']
}>()

function updateField<K extends keyof UniversalDiscoverRule>(
  field: K,
  value: UniversalDiscoverRule[K]
): void {
  if (!props.rule) return
  emit('update:rule', { ...props.rule, [field]: value })
}

function updateAnyReaderField(field: string, value: unknown): void {
  if (!props.rule) return
  const anyReader = { ...props.rule.anyReader, [field]: value }
  emit('update:rule', { ...props.rule, anyReader })
}
</script>

<template>
  <div v-if="rule" class="discover-rule-form">
    <a-form-item label="启用发现页">
      <a-switch
        :model-value="rule.enabled"
        @update:model-value="updateField('enabled', $event as boolean)"
      />
    </a-form-item>
    <a-form-item label="发现URL">
      <a-textarea
        :model-value="rule.url"
        placeholder="分类::URL格式，或 @js: 动态规则"
        :auto-size="{ minRows: 3 }"
        @update:model-value="updateField('url', $event as string)"
      />
    </a-form-item>
    <a-form-item label="列表规则">
      <a-input
        :model-value="rule.list"
        placeholder="@css: 或 @xpath: 选择器"
        @update:model-value="updateField('list', $event as string)"
      />
    </a-form-item>
    <a-form-item label="名称规则">
      <a-input
        :model-value="rule.name"
        placeholder="@css:.name@text"
        @update:model-value="updateField('name', $event as string)"
      />
    </a-form-item>
    <a-form-item label="封面规则">
      <a-input
        :model-value="rule.cover"
        placeholder="@css:img@src"
        @update:model-value="updateField('cover', $event as string)"
      />
    </a-form-item>
    <a-form-item label="作者规则">
      <a-input
        :model-value="rule.author"
        placeholder="@css:.author@text"
        @update:model-value="updateField('author', $event as string)"
      />
    </a-form-item>
    <a-form-item label="描述规则">
      <a-input
        :model-value="rule.description"
        placeholder="@css:.intro@text"
        @update:model-value="updateField('description', $event as string)"
      />
    </a-form-item>
    <a-form-item label="标签规则">
      <a-input
        :model-value="rule.tags"
        placeholder="@css:.tags@text"
        @update:model-value="updateField('tags', $event as string)"
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
    <a-form-item label="结果URL规则">
      <a-input
        :model-value="rule.result"
        placeholder="@css:a@href"
        @update:model-value="updateField('result', $event as string)"
      />
    </a-form-item>
    <a-form-item label="下一页URL规则">
      <a-input
        :model-value="rule.nextUrl"
        placeholder="下一页 URL 选择器"
        @update:model-value="updateField('nextUrl', $event as string)"
      />
    </a-form-item>

    <PlatformConfigSection
      :active-platform="platformTab"
      @update:active-platform="emit('update:platformTab', $event)"
    >
      <template #any-reader>
        <div v-if="rule.anyReader">
          <a-form-item label="发现项模板">
            <a-textarea
              :model-value="rule.anyReader.items"
              placeholder="发现项模板"
              :auto-size="{ minRows: 2 }"
              @update:model-value="updateAnyReaderField('items', $event)"
            />
          </a-form-item>
        </div> </template
    ></PlatformConfigSection>
  </div>
</template>
