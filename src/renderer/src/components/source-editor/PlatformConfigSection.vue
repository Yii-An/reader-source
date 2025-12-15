<script setup lang="ts">
defineProps<{
  activePlatform: 'any-reader' | 'legado'
}>()

const emit = defineEmits<{
  'update:activePlatform': [platform: 'any-reader' | 'legado']
}>()
</script>

<template>
  <div class="platform-section">
    <div class="platform-header">平台特有配置</div>
    <a-tabs
      :active-key="activePlatform"
      type="line"
      size="small"
      @change="
        (key: string | number) => emit('update:activePlatform', key as 'any-reader' | 'legado')
      "
    >
      <a-tab-pane key="any-reader" title="any-reader">
        <div class="platform-content">
          <slot name="any-reader"><a-empty description="此平台无特有配置" /> </slot>
        </div>
      </a-tab-pane>
      <a-tab-pane key="legado" title="Legado">
        <div class="platform-content">
          <slot name="legado">
            <a-empty description="此平台无特有配置" />
          </slot>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.platform-section {
  margin-top: 16px;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  padding: 12px;
  background-color: var(--color-fill-1);
}

.platform-header {
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
  color: var(--color-text-2);
}

.platform-content {
  padding-top: 12px;
}
</style>
