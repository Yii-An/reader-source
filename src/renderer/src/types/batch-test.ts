/**
 * Batch test type definitions
 * @file src/renderer/src/types/batch-test.ts
 */

/**
 * Batch test type
 */
export type BatchTestType = 'search' | 'chapter' | 'content' | 'discover'

/**
 * Test status
 */
export type BatchTestStatus = 'pending' | 'running' | 'success' | 'error' | 'timeout' | 'cancelled'

/**
 * Batch test configuration
 */
export interface BatchTestConfig {
  /** Test type */
  testType: BatchTestType
  /** Concurrency (1-10) */
  concurrency: number
  /** Timeout in milliseconds per test */
  timeout: number
  /** Whether to continue on timeout */
  continueOnTimeout: boolean
  /** Whether to continue on error */
  continueOnError: boolean
}

/**
 * Batch test input parameters
 */
export interface BatchTestInput {
  /** Search keyword */
  keyword?: string
  /** Chapter/content test URL */
  url?: string
  /** Discover category index */
  discoverIndex?: number
}

/**
 * Search result item
 */
export interface SearchResult {
  name: string
  url: string
  cover?: string
  author?: string
}

/**
 * Batch test result
 */
export interface BatchTestResult {
  /** Test status */
  status: BatchTestStatus
  /** Test type */
  testType: BatchTestType
  /** Result count */
  count: number
  /** Error message */
  error?: string
  /** Duration in milliseconds */
  duration?: number
  /** Visual data (search results, chapter list, etc.) */
  visualData?: SearchResult[]
  /** Parsed structured data */
  parsedResult?: unknown[]
  /** Raw HTML content */
  rawHtml?: string
  /** Test start time */
  startTime?: number
  /** Test end time */
  endTime?: number
  /** Input snapshot for retry */
  inputSnapshot?: BatchTestInput
}

/**
 * Batch test controller interface
 */
export interface BatchTestController {
  /** Whether the test is cancelled */
  isCancelled: boolean
  /** Active AbortControllers for in-progress requests */
  abortControllers: AbortController[]
  /** Cancel the test (abort all in-progress requests and stop scheduling) */
  cancel: () => void
}

/**
 * Chain test step type
 */
export type ChainTestStep = 'search' | 'chapter' | 'content' | 'discover'

/**
 * Chain test step status
 */
export type ChainStepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'

/**
 * Chapter result item
 */
export interface ChapterResult {
  name: string
  url: string
}

/**
 * Discover category group
 */
export interface CategoryGroup {
  name: string
  items: { name: string; url: string }[]
}

/**
 * Discover result item
 */
export interface DiscoverResult {
  name: string
  url: string
  cover?: string
  author?: string
}

/**
 * Single step result in chain test
 */
export interface ChainStepResult {
  /** Step status */
  status: ChainStepStatus
  /** Duration in milliseconds */
  duration?: number
  /** Error message if failed */
  error?: string
  /** Result count */
  count?: number
  /** Raw HTML */
  rawHtml?: string
}

/**
 * Search step result
 */
export interface SearchStepResult extends ChainStepResult {
  results: SearchResult[]
  /** First item used for next step */
  selectedItem?: SearchResult
}

/**
 * Chapter step result
 */
export interface ChapterStepResult extends ChainStepResult {
  results: ChapterResult[]
  /** First chapter used for next step */
  selectedItem?: ChapterResult
}

/**
 * Content step result
 */
export interface ContentStepResult extends ChainStepResult {
  /** Content text lines */
  content: string[]
}

/**
 * Discover step result
 */
export interface DiscoverStepResult extends ChainStepResult {
  /** Category groups */
  groups: CategoryGroup[]
  /** Discover results */
  results: DiscoverResult[]
}

/**
 * Complete chain test result for a single source
 */
export interface ChainTestResult {
  /** Current step being executed */
  currentStep: ChainTestStep | 'completed'
  /** Whether discover is available for this source */
  hasDiscover: boolean
  /** Total duration */
  totalDuration?: number
  /** Search step result */
  search: SearchStepResult
  /** Chapter step result */
  chapter: ChapterStepResult
  /** Content step result */
  content: ContentStepResult
  /** Discover step result */
  discover: DiscoverStepResult
}

/**
 * Create initial chain test result
 */
export function createInitialChainResult(hasDiscover: boolean): ChainTestResult {
  return {
    currentStep: 'search',
    hasDiscover,
    search: { status: 'pending', results: [] },
    chapter: { status: 'pending', results: [] },
    content: { status: 'pending', content: [] },
    discover: { status: hasDiscover ? 'pending' : 'skipped', groups: [], results: [] }
  }
}
