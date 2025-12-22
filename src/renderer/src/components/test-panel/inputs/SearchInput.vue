<script setup lang="ts">
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
      <template #suffix>
        <t-button size="medium" :loading="loading" @click="emit('test')">搜索</t-button>
      </template>
    </t-input>
  </div>
</template>

<style scoped></style>
