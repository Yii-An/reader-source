<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  direction: 'horizontal' | 'vertical'
  minSize?: number
  maxSize?: number
}>()

const emit = defineEmits<{
  resize: [delta: number]
  resizeEnd: []
}>()

const isDragging = ref(false)
const startPos = ref(0)

function handleMouseDown(e: MouseEvent): void {
  isDragging.value = true
  startPos.value = props.direction === 'horizontal' ? e.clientY : e.clientX

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = props.direction === 'horizontal' ? 'row-resize' : 'col-resize'
  document.body.style.userSelect = 'none'

  e.preventDefault()
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDragging.value) return

  const currentPos = props.direction === 'horizontal' ? e.clientY : e.clientX
  const delta = currentPos - startPos.value
  startPos.value = currentPos

  emit('resize', delta)
}

function handleMouseUp(): void {
  if (!isDragging.value) return

  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  emit('resizeEnd')
}
</script>

<template>
  <div :class="['resizer', `resizer-${direction}`]" @mousedown="handleMouseDown">
    <div class="resizer-line" />
  </div>
</template>

<style scoped>
.resizer {
  position: relative;
  flex-shrink: 0;
  background: transparent;
  transition: background 0.15s;
  z-index: 10;
}

.resizer:hover {
  background: rgba(var(--primary-6), 0.1);
}

/* 水平分隔器（上下拖动） */
.resizer-horizontal {
  width: 100%;
  height: 6px;
  cursor: row-resize;
}

.resizer-horizontal .resizer-line {
  position: absolute;
  top: 2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-border);
  transition: background 0.15s;
}

/* 垂直分隔器（左右拖动） */
.resizer-vertical {
  width: 6px;
  height: 100%;
  cursor: col-resize;
}

.resizer-vertical .resizer-line {
  position: absolute;
  left: 2px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
  transition: background 0.15s;
}

.resizer:hover .resizer-line {
  background: rgb(var(--primary-6));
}
</style>
