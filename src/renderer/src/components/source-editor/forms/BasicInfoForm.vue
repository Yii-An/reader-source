<script setup lang="ts">
import { computed } from 'vue'
import type { UniversalRule } from '../../../types/universal'
import { UniversalContentType, UniversalContentTypeLabels } from '../../../types/universal'
import PlatformConfigSection from '../PlatformConfigSection.vue'

const props = defineProps<{
  rule: UniversalRule
  platformTab: 'any-reader' | 'legado'
}>()

const emit = defineEmits<{
  'update:rule': [rule: UniversalRule]
  'update:platformTab': [tab: 'any-reader' | 'legado']
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

function updateAnyReaderField(field: string, value: unknown): void {
  const anyReader = { ...props.rule.anyReader, [field]: value }
  emit('update:rule', { ...props.rule, anyReader })
}

function updateLegadoField(field: string, value: unknown): void {
  const legado = { ...props.rule.legado, [field]: value }
  emit('update:rule', { ...props.rule, legado })
}
</script>

<template>
  <div class="basic-info-form">
    <a-form-item label="书源名称">
      <a-input
        :model-value="rule.name"
        placeholder="输入书源名称"
        @update:model-value="updateField('name', $event as string)"
      />
    </a-form-item>
    <a-form-item label="域名 (host)">
      <a-input
        :model-value="rule.host"
        placeholder="https://example.com"
        @update:model-value="updateField('host', $event as string)"
      />
    </a-form-item>
    <a-form-item label="内容类型">
      <a-select
        :model-value="rule.contentType"
        :options="contentTypeOptions"
        @update:model-value="updateField('contentType', $event as UniversalContentType)"
      />
    </a-form-item>
    <a-form-item label="启用">
      <a-switch
        :model-value="rule.enabled"
        @update:model-value="updateField('enabled', $event as boolean)"
      />
    </a-form-item>
    <a-form-item label="图标">
      <a-input
        :model-value="rule.icon"
        placeholder="图标 URL（可选）"
        @update:model-value="updateField('icon', $event as string)"
      />
    </a-form-item>
    <a-form-item label="作者">
      <a-input
        :model-value="rule.author"
        placeholder="规则作者（可选）"
        @update:model-value="updateField('author', $event as string)"
      />
    </a-form-item>
    <a-form-item label="分组">
      <a-input
        :model-value="rule.group"
        placeholder="规则分组（可选）"
        @update:model-value="updateField('group', $event as string)"
      />
    </a-form-item>
    <a-form-item label="排序权重">
      <a-input-number
        :model-value="rule.sort"
        placeholder="数字越小越靠前"
        @update:model-value="updateField('sort', $event as number)"
      />
    </a-form-item>
    <a-form-item label="备注说明">
      <a-textarea
        :model-value="rule.comment"
        placeholder="规则说明（可选）"
        :auto-size="{ minRows: 2 }"
        @update:model-value="updateField('comment', $event as string)"
      />
    </a-form-item>
    <a-form-item label="User-Agent">
      <a-input
        :model-value="rule.userAgent"
        placeholder="自定义 User-Agent（可选）"
        @update:model-value="updateField('userAgent', $event as string)"
      />
    </a-form-item>
    <a-form-item label="全局 JS 脚本">
      <a-textarea
        :model-value="rule.loadJs"
        placeholder="页面加载时执行的 JS 脚本（可选）"
        :auto-size="{ minRows: 2 }"
        @update:model-value="updateField('loadJs', $event as string)"
      />
    </a-form-item>

    <PlatformConfigSection
      :active-platform="platformTab"
      @update:active-platform="emit('update:platformTab', $event)"
    >
      <template #any-reader>
        <div v-if="rule.anyReader">
          <a-form-item label="使用 CryptoJS">
            <a-switch
              :model-value="rule.anyReader.useCryptoJS"
              @update:model-value="updateAnyReaderField('useCryptoJS', $event)"
            />
          </a-form-item>
          <a-form-item label="Cookies">
            <a-input
              :model-value="rule.anyReader.cookies"
              placeholder="Cookie 存储"
              @update:model-value="updateAnyReaderField('cookies', $event)"
            />
          </a-form-item>
          <a-form-item label="视图样式">
            <a-input-number
              :model-value="rule.anyReader.viewStyle"
              placeholder="0"
              @update:model-value="updateAnyReaderField('viewStyle', $event)"
            />
          </a-form-item>
          <a-form-item label="后处理脚本">
            <a-textarea
              :model-value="rule.anyReader.postScript"
              placeholder="脚本后处理"
              :auto-size="{ minRows: 2 }"
              @update:model-value="updateAnyReaderField('postScript', $event)"
            />
          </a-form-item>
        </div>
      </template>
      <template #legado>
        <a-form-item label="JS 函数库">
          <a-textarea
            :model-value="rule.jsLib"
            placeholder="复杂规则共用的 JS 函数"
            :auto-size="{ minRows: 3 }"
            @update:model-value="updateField('jsLib', $event as string)"
          />
        </a-form-item>
        <div v-if="rule.legado">
          <a-form-item label="书籍 URL正则">
            <a-input
              :model-value="rule.legado.bookUrlPattern"
              placeholder="用于识别书源的 URL 正则"
              @update:model-value="updateLegadoField('bookUrlPattern', $event)"
            />
          </a-form-item>
          <a-form-item label="启用 Cookie罐">
            <a-switch
              :model-value="rule.legado.enabledCookieJar"
              @update:model-value="updateLegadoField('enabledCookieJar', $event)"
            />
          </a-form-item>
          <a-form-item label="权重">
            <a-input-number
              :model-value="rule.legado.weight"
              placeholder="排序权重"
              @update:model-value="updateLegadoField('weight', $event)"
            />
          </a-form-item>
          <a-divider orientation="left">登录设置</a-divider>
          <a-form-item label="登录 URL">
            <a-input
              :model-value="rule.legado.loginUrl"
              placeholder="登录页面地址"
              @update:model-value="updateLegadoField('loginUrl', $event)"
            />
          </a-form-item>
          <a-form-item label="登录检测URL">
            <a-input
              :model-value="rule.legado.loginCheckUrl"
              placeholder="检测登录状态的地址"
              @update:model-value="updateLegadoField('loginCheckUrl', $event)"
            />
          </a-form-item>
          <a-form-item label="登录 UI配置">
            <a-textarea
              :model-value="rule.legado.loginUi"
              placeholder="登录 UI 配置 JSON"
              :auto-size="{ minRows: 2 }"
              @update:model-value="updateLegadoField('loginUi', $event)"
            />
          </a-form-item>
          <a-form-item label="登录检测 JS">
            <a-textarea
              :model-value="rule.legado.loginCheckJs"
              placeholder="登录检测 JS 脚本"
              :auto-size="{ minRows: 2 }"
              @update:model-value="updateLegadoField('loginCheckJs', $event)"
            />
          </a-form-item>
        </div>
      </template>
    </PlatformConfigSection>
  </div>
</template>
