<script setup lang="ts">
import type { UniversalChapterRule } from '../../../types/universal'
import PlatformConfigSection from '../PlatformConfigSection.vue'

const props = defineProps<{
  rule: UniversalChapterRule | undefined
  platformTab: 'any-reader' | 'legado'
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalChapterRule]
  'update:platformTab': [tab: 'any-reader' | 'legado']
}>()

function updateField<K extends keyof UniversalChapterRule>(
  field: K,
  value: UniversalChapterRule[K]
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
  <div v-if="rule" class="chapter-rule-form">
    <a-form-item label="章节页URL">
      <a-input
        :model-value="rule.url"
        placeholder="{{result}} 为上一步结果"
        @update:model-value="updateField('url', $event as string)"
      />
    </a-form-item>
    <a-form-item label="章节列表规则">
      <a-input
        :model-value="rule.list"
        placeholder="@css: 或 @xpath: 选择器"
        @update:model-value="updateField('list', $event as string)"
      />
    </a-form-item>
    <a-form-item label="章节名规则">
      <a-input
        :model-value="rule.name"
        placeholder="@text"
        @update:model-value="updateField('name', $event as string)"
      />
    </a-form-item>
    <a-form-item label="章节封面规则">
      <a-input
        :model-value="rule.cover"
        placeholder="章节封面选择器（可选）"
        @update:model-value="updateField('cover', $event as string)"
      />
    </a-form-item>
    <a-form-item label="更新时间规则">
      <a-input
        :model-value="rule.time"
        placeholder="更新时间选择器（可选）"
        @update:model-value="updateField('time', $event as string)"
      />
    </a-form-item>
    <a-form-item label="章节信息规则">
      <a-input
        :model-value="rule.info"
        placeholder="章节信息规则（可选）"
        @update:model-value="updateField('info', $event as string)"
      />
    </a-form-item>
    <a-form-item label="章节URL规则">
      <a-input
        :model-value="rule.result"
        placeholder="@css:a@href"
        @update:model-value="updateField('result', $event as string)"
      />
    </a-form-item>
    <a-form-item label="下一页URL">
      <a-input
        :model-value="rule.nextUrl"
        placeholder="翻页规则（可选）"
        @update:model-value="updateField('nextUrl', $event as string)"
      />
    </a-form-item>

    <PlatformConfigSection
      :active-platform="platformTab"
      @update:active-platform="emit('update:platformTab', $event)"
    >
      <template #any-reader>
        <div v-if="rule.anyReader">
          <a-form-item label="章节项模板">
            <a-textarea
              :model-value="rule.anyReader.items"
              placeholder="章节项模板"
              :auto-size="{ minRows: 2 }"
              @update:model-value="updateAnyReaderField('items', $event)"
            />
          </a-form-item>
          <a-form-item label="章节锁定标识">
            <a-input
              :model-value="rule.anyReader.lock"
              placeholder="章节锁定标识选择器"
              @update:model-value="updateAnyReaderField('lock', $event)"
            />
          </a-form-item>
        </div> </template
      ><template #legado>
        <a-form-item label="VIP 标识">
          <a-input
            :model-value="rule.isVip"
            placeholder="VIP 章节标识"
            @update:model-value="updateField('isVip', $event as string)"
          />
        </a-form-item>
        <a-form-item label="付费标识">
          <a-input
            :model-value="rule.isPay"
            placeholder="付费章节标识"
            @update:model-value="updateField('isPay', $event as string)"
          />
        </a-form-item>
      </template>
    </PlatformConfigSection>
  </div>
</template>
