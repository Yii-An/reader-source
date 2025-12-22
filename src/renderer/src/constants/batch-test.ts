/**
 * Batch test constants
 * @file src/renderer/src/constants/batch-test.ts
 */

import type { BatchTestConfig } from '../types/batch-test'

/**
 * Default batch test configuration
 */
export const DEFAULT_BATCH_TEST_CONFIG: BatchTestConfig = {
  testType: 'search',
  concurrency: 3,
  timeout: 30000, // 30 seconds
  continueOnTimeout: true,
  continueOnError: true
}

/**
 * Batch test configuration limits
 */
export const BATCH_TEST_CONFIG_LIMITS = {
  concurrency: { min: 1, max: 10 },
  timeout: { min: 5000, max: 120000 }
} as const
