/**
 * 日志状态管理 Store
 *
 * 职责:
 * - 管理应用程序日志的收集和展示
 * - 提供日志过滤和导出功能
 * - 自动清理过多的日志条目
 *
 * 日志级别:
 * - info: 一般信息
 * - debug: 调试信息
 * - warn: 警告信息
 * - error: 错误信息
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LogItem, LogLevel } from '../types'

/** 日志最大条目数 */
const MAX_LOGS = 1000
/** 清理后保留的日志数 */
const TRIM_TO = 500

function sendToMain(level: LogLevel, message: string, data?: unknown): void {
  try {
    if (typeof window === 'undefined') return
    const api = (window as Window).api
    if (!api?.log) return
    api.log({ level, message, data, scope: 'renderer' }).catch(() => {})
  } catch {
    // 忽略跨进程写入失败，避免影响前端日志展示
  }
}

export const useLogStore = defineStore('log', () => {
  // ============================================================
  // 响应式状态
  // ============================================================

  /** 所有日志条目 */
  const logs = ref<LogItem[]>([])

  /** 当前筛选的日志级别 */
  const filterLevel = ref<LogLevel | 'all'>('all')

  /** 日志文本搜索关键词 */
  const filterText = ref('')

  // ============================================================
  // 计算属性
  // ============================================================

  /**
   * 根据级别和关键词过滤后的日志列表
   */
  const filteredLogs = computed(() => {
    return logs.value.filter((log) => {
      // 按级别过滤
      if (filterLevel.value !== 'all' && log.level !== filterLevel.value) {
        return false
      }
      // 按关键词过滤
      if (filterText.value && !log.message.toLowerCase().includes(filterText.value.toLowerCase())) {
        return false
      }
      return true
    })
  })

  /**
   * 各级别日志数量统计
   */
  const logCounts = computed(() => {
    const counts = { all: logs.value.length, info: 0, debug: 0, warn: 0, error: 0 }
    for (const log of logs.value) {
      counts[log.level]++
    }
    return counts
  })

  // ============================================================
  // 核心方法
  // ============================================================

  /**
   * 添加日志条目
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据（可选）
   */
  function addLog(level: LogLevel, message: string, data?: unknown): void {
    logs.value.unshift({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      data
    })
    sendToMain(level, message, data)
    // 自动清理过多的日志
    if (logs.value.length > MAX_LOGS) {
      logs.value = logs.value.slice(0, TRIM_TO)
    }
  }

  // ============================================================
  // 便捷方法
  // ============================================================

  /** 记录 info 级别日志 */
  function info(message: string, data?: unknown): void {
    addLog('info', message, data)
  }

  /** 记录 debug 级别日志 */
  function debug(message: string, data?: unknown): void {
    addLog('debug', message, data)
  }

  /** 记录 warn 级别日志 */
  function warn(message: string, data?: unknown): void {
    addLog('warn', message, data)
  }

  /** 记录 error 级别日志 */
  function error(message: string, data?: unknown): void {
    addLog('error', message, data)
  }

  // ============================================================
  // 管理方法
  // ============================================================

  /** 清空所有日志 */
  function clearLogs(): void {
    logs.value = []
  }

  /**
   * 导出日志为 JSON 字符串
   * @returns 格式化的 JSON 字符串
   */
  function exportLogs(): string {
    return JSON.stringify(logs.value, null, 2)
  }

  // ============================================================
  // 导出 Store API
  // ============================================================

  return {
    // 状态
    logs, // 所有日志
    filterLevel, // 筛选级别
    filterText, // 搜索关键词

    // 计算属性
    filteredLogs, // 过滤后的日志
    logCounts, // 各级别数量

    // 便捷方法
    info,
    debug,
    warn,
    error,

    // 管理方法
    clearLogs, // 清空日志
    exportLogs // 导出日志
  }
})
