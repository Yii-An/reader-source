<!--
  @file BatchTestToolbar.vue - 批量测试工具栏组件
  简化版：只有关键词输入、开始/取消按钮、配置按钮
-->
<script setup lang="ts">
import { SettingIcon, CloseIcon } from 'tdesign-icons-vue-next'

interface Props {
  testing: boolean
  keyword: string
  canStart: boolean
}

defineProps<Props>()

defineEmits<{
  'update:keyword': [value: string]
  start: []
  cancel: []
  openConfig: []
}>()
</script>

<template>
  <div class="batch-test-toolbar">
    <!-- Keyword input -->
    <t-input
      class="keyword-input"
      :model-value="keyword"
      placeholder="输入搜索关键词"
      :disabled="testing"
      @update:model-value="$emit('update:keyword', $event)"
      @enter="$emit('start')"
    />

    <!-- Action buttons -->
    <t-button v-if="!testing" theme="primary" :disabled="!canStart" @click="$emit('start')">
      开始测试
    </t-button>
    <t-button v-else theme="danger" @click="$emit('cancel')">
      <template #icon><close-icon /></template>
      取消测试
    </t-button>

    <!-- Config button -->
    <t-button variant="outline" @click="$emit('openConfig')">
      <template #icon><setting-icon /></template>
    </t-button>
  </div>
</template>

<style scoped>
.batch-test-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.keyword-input {
  min-width: 260px;
  width: min(360px, 42vw);
}
</style>
