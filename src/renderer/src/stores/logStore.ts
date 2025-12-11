import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LogItem, LogLevel } from '../types'

export const useLogStore = defineStore('log', () => {
  const logs = ref<LogItem[]>([])
  const filterLevel = ref<LogLevel | 'all'>('all')
  const filterText = ref('')

  const filteredLogs = computed(() => {
    return logs.value.filter((log) => {
      if (filterLevel.value !== 'all' && log.level !== filterLevel.value) {
        return false
      }
      if (filterText.value && !log.message.toLowerCase().includes(filterText.value.toLowerCase())) {
        return false
      }
      return true
    })
  })

  const logCounts = computed(() => {
    const counts = { all: logs.value.length, info: 0, debug: 0, warn: 0, error: 0 }
    for (const log of logs.value) {
      counts[log.level]++
    }
    return counts
  })

  function addLog(level: LogLevel, message: string, data?: unknown) {
    logs.value.unshift({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      data
    })
    if (logs.value.length > 1000) {
      logs.value = logs.value.slice(0, 500)
    }
  }

  function info(message: string, data?: unknown) {
    addLog('info', message, data)
  }
  function debug(message: string, data?: unknown) {
    addLog('debug', message, data)
  }
  function warn(message: string, data?: unknown) {
    addLog('warn', message, data)
  }
  function error(message: string, data?: unknown) {
    addLog('error', message, data)
  }

  function clearLogs() {
    logs.value = []
  }

  function exportLogs(): string {
    return JSON.stringify(logs.value, null, 2)
  }

  return {
    logs,
    filterLevel,
    filterText,
    filteredLogs,
    logCounts,
    info,
    debug,
    warn,
    error,
    clearLogs,
    exportLogs
  }
})
