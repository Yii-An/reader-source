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
  <div class="content-input">
    <t-input
      :value="url"
      placeholder="正文页URL"
      style="margin-bottom: 8px"
      @change="emit('update:url', $event as string)"
    />

    <t-button
      theme="primary"
      size="small"
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
.content-input {
  margin-bottom: 8px;
}
</style>