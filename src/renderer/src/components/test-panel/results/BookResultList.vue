<!--
  @file BookResultList.vue - 通用书籍结果列表组件
  @description 搜索和发现页面共用的结果列表组件，支持：
               1. 封面图片显示（可选，通过 showCover prop 控制）
               2. 封面图片代理（绕过防盗链）
               3. 作者和链接信息展示
               4. 点击选择事件
-->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

/** 通用书籍/结果项类型 - 搜索和发现共用 */
export interface BookResultItem {
  name: string
  url: string
  cover?: string
  author?: string
}

const props = withDefaults(
  defineProps<{
    results: BookResultItem[]
    /** 是否显示封面图片，默认 true */
    showCover?: boolean
  }>(),
  {
    showCover: true
  }
)

const emit = defineEmits<{
  select: [item: BookResultItem]
}>()

/** 代理后的封面图片 URL 缓存 */
const proxiedCovers = ref<Map<string, string>>(new Map())

/** 代理封面图片 */
async function proxyCover(url: string): Promise<void> {
  if (!url || proxiedCovers.value.has(url)) return

  try {
    const result = await window.api.proxyImage(url)
    if (result.success && result.dataUrl) {
      proxiedCovers.value.set(url, result.dataUrl)
      proxiedCovers.value = new Map(proxiedCovers.value)
    }
  } catch {
    // 代理失败，使用原始 URL
  }
}

/** 获取封面图片 URL */
function getCoverUrl(item: BookResultItem): string | undefined {
  if (!item.cover) return undefined
  return proxiedCovers.value.get(item.cover) || item.cover
}

/** 代理所有封面 */
function proxyAllCovers(): void {
  if (!props.showCover) return
  props.results.forEach((item) => {
    if (item.cover) {
      proxyCover(item.cover)
    }
  })
}

onMounted(() => {
  proxyAllCovers()
})

watch(
  () => props.results,
  () => {
    proxyAllCovers()
  }
)
</script>

<template>
  <div class="result-list">
    <div
      v-for="(item, index) in results"
      :key="index"
      class="result-item"
      @click="emit('select', item)"
    >
      <!-- 封面图片（可选） -->
      <div v-if="showCover" class="result-cover">
        <img v-if="item.cover" :src="getCoverUrl(item)" alt="cover" class="cover-img" />
        <div v-else class="cover-placeholder">
          <icon-image />
          <span>暂无封面</span>
        </div>
      </div>

      <div class="result-info">
        <div class="result-name">{{ item.name }}</div>
        <div class="result-url">作者：{{ item.author || '未知作者' }}</div>
        <div class="result-url">链接：{{ item.url || '未知链接' }}</div>
      </div>
      <icon-right class="result-arrow" />
    </div>
  </div>
</template>

<style scoped>
.result-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.result-item {
  width: calc(100% - 8px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  padding-left: 14px;
  background: var(--color-bg-3);
  border-radius: 8px;
  box-sizing: border-box;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background: var(--color-fill-3);
  border-left-color: var(--color-primary);
}

.result-cover {
  flex-shrink: 0;
  width: 48px;
  height: 64px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-fill-2);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-4);
  font-size: 10px;
  gap: 2px;
}

.cover-placeholder :deep(svg) {
  font-size: 16px;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.result-url {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-arrow {
  color: var(--color-text-3);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.result-item:hover .result-arrow {
  transform: translateX(4px);
  color: var(--color-primary);
}
</style>
