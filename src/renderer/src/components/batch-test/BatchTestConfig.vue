<!--
  @file BatchTestConfig.vue - 批量测试配置面板组件
  抽屉形式的配置面板,包含并发数、超时时间、继续策略
-->
<script setup lang="ts">
import type { BatchTestConfig } from '../../types/batch-test'
import { BATCH_TEST_CONFIG_LIMITS } from '../../constants/batch-test'

interface Props {
  visible: boolean
  config: BatchTestConfig
}

defineProps<Props>()

defineEmits<{
  'update:visible': [value: boolean]
  'update:concurrency': [value: number]
  'update:timeout': [value: number]
  'update:continueOnTimeout': [value: boolean]
  'update:continueOnError': [value: boolean]
}>()
</script>

<template>
  <t-drawer
    :visible="visible"
    header="测试配置"
    :footer="false"
    size="360px"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="config-section">
      <div class="config-item">
        <label>并发数</label>
        <t-slider
          :model-value="config.concurrency"
          :min="BATCH_TEST_CONFIG_LIMITS.concurrency.min"
          :max="BATCH_TEST_CONFIG_LIMITS.concurrency.max"
          :step="1"
          :show-step="true"
          @update:model-value="$emit('update:concurrency', $event as number)"
        />
        <span class="config-value">{{ config.concurrency }}</span>
      </div>

      <div class="config-item">
        <label>超时时间</label>
        <t-slider
          :model-value="config.timeout"
          :min="BATCH_TEST_CONFIG_LIMITS.timeout.min"
          :max="BATCH_TEST_CONFIG_LIMITS.timeout.max"
          :step="5000"
          @update:model-value="$emit('update:timeout', $event as number)"
        />
        <span class="config-value">{{ config.timeout / 1000 }}s</span>
      </div>

      <div class="config-item">
        <t-checkbox
          :checked="config.continueOnTimeout"
          @change="$emit('update:continueOnTimeout', $event)"
        >
          超时后继续测试其他书源
        </t-checkbox>
      </div>

      <div class="config-item">
        <t-checkbox
          :checked="config.continueOnError"
          @change="$emit('update:continueOnError', $event)"
        >
          失败后继续测试其他书源
        </t-checkbox>
      </div>
    </div>
  </t-drawer>
</template>

<style scoped>
.config-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-weight: 500;
  color: var(--color-text-1);
}

.config-value {
  font-size: 14px;
  color: var(--color-text-2);
  text-align: right;
}
</style>
