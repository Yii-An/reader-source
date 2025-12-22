<script setup lang="ts">
import { FlashlightIcon } from 'tdesign-icons-vue-next'

defineProps<{
  url: string
  loading: boolean
}>()

const emit = defineEmits<{
  'update:url': [value: string]
  test: []
}>()
</script>

<template>
  <div class="chapter-input">
    <t-input
      :value="url"
      placeholder="章节页URL"
      style="margin-bottom: 8px"
      @change="emit('update:url', $event as string)"
    />

    <t-button
      theme="primary"
      size="medium"
      :loading="loading"
      style="width: 100%"
      @click="emit('test')"
    >
      <template #icon><flashlight-icon /></template>
      执行测试
    </t-button>
  </div>
</template>

<style scoped>
.chapter-input {
  margin-bottom: 8px;
}
</style>
