<script setup lang="ts">
defineProps<{
  content: string[]
  isManga: boolean
}>()
</script>

<template>
  <div class="content-preview">
    <!-- 漫画模式：普通列表 + 图片懒加载 -->
    <template v-if="isManga">
      <div class="manga-images">
        <template v-for="(imgUrl, index) in content" :key="index">
          <a-image width="100%" :src="imgUrl" :alt="`第 ${index + 1} 页`" />
        </template>
      </div>
    </template>

    <!-- 文本模式：普通列表 -->
    <template v-else>
      <p v-for="(para, index) in content" :key="index">{{ para }}</p>
    </template>
  </div>
</template>

<style scoped>
.content-preview {
  line-height: 1.8;
  font-size: 14px;
}

.content-preview p {
  text-indent: 2em;
  margin-bottom: 1em;
}

.manga-images {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
