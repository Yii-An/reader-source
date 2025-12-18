<script setup lang="ts">
import { SearchIcon } from 'tdesign-icons-vue-next'

defineProps<{
  keyword: string
  loading: boolean
}>()

const emit = defineEmits<{
  'update:keyword': [value: string]
  test: []
}>()
</script>

<template>
  <div class="search-input">
    <t-input
      :value="keyword"
      placeholder="输入搜索关键词..."
      @change="emit('update:keyword', $event as string)"
      @enter="emit('test')"
    >
      <template #suffix-icon>
        <search-icon />
      </template>
      <template #suffix>
        <t-button size="small" :loading="loading" @click="emit('test')">测试</t-button>
      </template>
    </t-input>
  </div>
</template>

<style scoped>
.search-input {
  margin-bottom: 8px;
}
</style>