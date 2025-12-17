/**
 * 类型定义入口
 */

// 导出规则类型
export * from './universal'

// 导出表达式类型
export * from './expression'

/**
 * 日志级别
 */
export type LogLevel = 'info' | 'debug' | 'warn' | 'error'

/**
 * 日志条目
 */
export type LogItem = {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  data?: unknown
}
