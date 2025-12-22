/**
 * Batch test configuration persistence
 * @file src/renderer/src/utils/batch-test-config.ts
 */

import type { BatchTestConfig } from '../types/batch-test'
import { DEFAULT_BATCH_TEST_CONFIG, BATCH_TEST_CONFIG_LIMITS } from '../constants/batch-test'

const CONFIG_KEY = 'batchTestConfig'
const CURRENT_VERSION = 1

interface StoredConfig {
  version: number
  data: BatchTestConfig
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Validate and clamp config values within limits
 */
function validateConfig(config: BatchTestConfig): BatchTestConfig {
  const { concurrency, timeout } = BATCH_TEST_CONFIG_LIMITS
  return {
    ...config,
    concurrency: clamp(config.concurrency, concurrency.min, concurrency.max),
    timeout: clamp(config.timeout, timeout.min, timeout.max)
  }
}

/**
 * Load batch test configuration from localStorage
 * @returns Validated configuration or default values
 */
export function loadBatchTestConfig(): BatchTestConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { ...DEFAULT_BATCH_TEST_CONFIG }

    const stored: StoredConfig = JSON.parse(raw)

    // Version mismatch: return default config
    if (stored.version !== CURRENT_VERSION) {
      console.warn(
        `Batch test config version mismatch (${stored.version} -> ${CURRENT_VERSION}), using defaults`
      )
      return { ...DEFAULT_BATCH_TEST_CONFIG }
    }

    // Validate and return
    return validateConfig(stored.data)
  } catch {
    return { ...DEFAULT_BATCH_TEST_CONFIG }
  }
}

/**
 * Save batch test configuration to localStorage
 * @param config Configuration to save
 */
export function saveBatchTestConfig(config: BatchTestConfig): void {
  const stored: StoredConfig = {
    version: CURRENT_VERSION,
    data: config
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(stored))
}
