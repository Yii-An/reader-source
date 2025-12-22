<script setup lang="ts">
import { FlashlightIcon } from 'tdesign-icons-vue-next'
import type { CategoryGroup } from '../composables'

defineProps<{
  groups: CategoryGroup[]
  selectedGroupIndex: number
  selectedItemIndex: number
  loading: boolean
  categoriesLoading: boolean
}>()

const emit = defineEmits<{
  'select-group': [index: number]
  'select-item': [index: number]
  test: []
}>()
</script>

<template>
  <div class="discover-input">
    <div v-if="groups.length > 0" class="discover-category-panel">
      <div class="category-groups">
        <t-radio-group
          :value="selectedGroupIndex"
          variant="default-filled"
          size="medium"
          @change="(val: any) => emit('select-group', val as number)"
        >
          <t-radio-button v-for="(group, gIdx) in groups" :key="gIdx" :value="gIdx">
            {{ group.name }}
          </t-radio-button>
        </t-radio-group>
      </div>
      <div v-if="groups[selectedGroupIndex]?.items.length > 1" class="category-items">
        <t-radio-group
          :value="selectedItemIndex"
          variant="default-filled"
          size="medium"
          @change="(val: any) => emit('select-item', val as number)"
        >
          <t-radio-button
            v-for="(item, iIdx) in groups[selectedGroupIndex].items"
            :key="iIdx"
            :value="iIdx"
          >
            {{ item.name }}
          </t-radio-button>
        </t-radio-group>
      </div>
    </div>

    <t-button
      theme="primary"
      size="medium"
      :loading="loading || categoriesLoading"
      style="margin-top: 8px; width: 100%"
      @click="emit('test')"
    >
      <template #icon><flashlight-icon /></template>
      {{ groups.length > 0 ? '刷新列表' : '加载分类' }}
    </t-button>
  </div>
</template>

<style scoped>
.discover-input {
  margin-bottom: 8px;
}

.discover-category-panel {
  padding: 0 0 12px 0;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-groups,
.category-items {
  display: flex;
  flex-wrap: wrap;
}
</style>
