<script setup lang="ts">
import type { UniversalContentRule } from '../../../types/universal'
import PlatformConfigSection from '../PlatformConfigSection.vue'

const props = defineProps<{
  rule: UniversalContentRule | undefined
  platformTab: 'any-reader' | 'legado'
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalContentRule]
  'update:platformTab': [tab: 'any-reader' | 'legado']
}>()

function updateField<K extends keyof UniversalContentRule>(
  field: K,
  value: UniversalContentRule[K]
): void {
  if (!props.rule) return
  emit('update:rule', { ...props.rule, [field]: value })
}

function updateLegadoField(field: string, value: unknown): void {
  if (!props.rule) return
  const legado = { ...props.rule.legado, [field]: value }
  emit('update:rule', { ...props.rule, legado })
}
</script>

<template>
  <div v-if="rule" class="content-rule-form">
    <a-form-item label="正文页URL">
      <a-input
        :model-value="rule.url"
        placeholder="{{result}} 为上一步结果"
        @update:model-value="updateField('url', $event as string)"
      />
    </a-form-item>
    <a-form-item label="正文内容规则">
      <a-textarea
        :model-value="rule.items"
        placeholder="@css:.content@text 或 @js: 规则"
        :auto-size="{ minRows: 3 }"
        @update:model-value="updateField('items', $event as string)"
      />
    </a-form-item>
    <a-form-item label="下一页URL">
      <a-input
        :model-value="rule.nextUrl"
        placeholder="翻页规则（可选）"
        @update:model-value="updateField('nextUrl', $event as string)"
      />
    </a-form-item>
    <a-form-item label="解密器">
      <a-textarea
        :model-value="rule.decoder"
        placeholder="图片解密器脚本（可选）"
        :auto-size="{ minRows: 2 }"
        @update:model-value="updateField('decoder', $event as string)"
      />
    </a-form-item>
    <a-form-item label="图片请求头">
      <a-input
        :model-value="rule.imageHeaders"
        placeholder="图片请求头（可选）"
        @update:model-value="updateField('imageHeaders', $event as string)"
      />
    </a-form-item>
    <a-form-item label="使用 WebView">
      <a-switch
        :model-value="rule.webView"
        @update:model-value="updateField('webView', $event as boolean)"
      />
    </a-form-item>
    <a-form-item label="购买操作">
      <a-input
        :model-value="rule.payAction"
        placeholder="付费章节购买规则（可选）"
        @update:model-value="updateField('payAction', $event as string)"
      />
    </a-form-item>
    <a-form-item label="资源正则">
      <a-input
        :model-value="rule.sourceRegex"
        placeholder="资源匹配正则（可选）"
        @update:model-value="updateField('sourceRegex', $event as string)"
      />
    </a-form-item>

    <PlatformConfigSection
      :active-platform="platformTab"
      @update:active-platform="emit('update:platformTab', $event)"
    >
      <template #any-reader
        ><a-form-item label="解密器">
          <a-textarea
            :model-value="rule.decoder"
            placeholder="图片解密器"
            :auto-size="{ minRows: 2 }"
            @update:model-value="updateField('decoder', $event as string)"
          />
        </a-form-item>
      </template>
      <template #legado>
        <div v-if="rule.legado">
          <a-form-item label="WebView JS">
            <a-textarea
              :model-value="rule.legado.webJs"
              placeholder="WebView 执行的 JS脚本"
              :auto-size="{ minRows: 2 }"
              @update:model-value="updateLegadoField('webJs', $event)"
            />
          </a-form-item>
          <a-form-item label="替换正则">
            <a-textarea
              :model-value="rule.legado.replaceRegex"
              placeholder="正文净化替换规则"
              :auto-size="{ minRows: 2 }"
              @update:model-value="updateLegadoField('replaceRegex', $event)"
            />
          </a-form-item>
          <a-form-item label="图片样式">
            <a-input
              :model-value="rule.legado.imageStyle"
              placeholder="图片样式"
              @update:model-value="updateLegadoField('imageStyle', $event)"
            />
          </a-form-item>
        </div>
      </template>
    </PlatformConfigSection>
  </div>
</template>
