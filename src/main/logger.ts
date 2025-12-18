import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// ==================== 配置常量 ====================

/** 日志目录路径 */
const LOG_DIR = path.join(app.getPath('userData'), 'logs')

/** 主日志文件路径 */
const LOG_FILE = path.join(LOG_DIR, 'app.log')

/** 单个日志文件最大大小 (2MB) */
const MAX_LOG_SIZE = 2 * 1024 * 1024

/** 保留的旧日志文件数量 */
const MAX_LOG_FILES = 3

/** 日志文件最大保留天数 */
const MAX_LOG_AGE_DAYS = 7

/** 轮转检查间隔（每 N 次写入检查一次文件大小） */
const ROTATION_CHECK_INTERVAL = 100

// ==================== 运行时状态 ====================

/** 写入计数器，用于减少文件大小检查频率 */
let writeCount = 0

/** 是否已初始化 */
let initialized = false

// ==================== 核心函数 ====================

/**
 * 确保日志目录存在
 */
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

/**
 * 清理过期的日志文件
 * @description 删除超过 MAX_LOG_AGE_DAYS 天的日志文件
 */
function cleanupOldLogs(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) return

    const files = fs.readdirSync(LOG_DIR)
    const now = Date.now()
    const maxAge = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000

    for (const file of files) {
      if (!file.startsWith('app.log')) continue

      const filePath = path.join(LOG_DIR, file)
      try {
        const stats = fs.statSync(filePath)
        const age = now - stats.mtime.getTime()

        if (age > maxAge) {
          fs.unlinkSync(filePath)
        }
      } catch {
        // 忽略单个文件的错误
      }
    }
  } catch {
    // 忽略清理错误
  }
}

/**
 * 日志文件轮转
 * @description 当日志文件超过 MAX_LOG_SIZE 时，进行轮转：
 *              app.log -> app.log.1 -> app.log.2 -> ... -> 删除
 */
function rotateLogFile(): void {
  try {
    if (!fs.existsSync(LOG_FILE)) return

    const stats = fs.statSync(LOG_FILE)
    if (stats.size < MAX_LOG_SIZE) return

    // 删除最旧的日志文件
    const oldestFile = `${LOG_FILE}.${MAX_LOG_FILES}`
    if (fs.existsSync(oldestFile)) {
      fs.unlinkSync(oldestFile)
    }

    // 轮转旧日志文件 (从后往前重命名)
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldFile = `${LOG_FILE}.${i}`
      const newFile = `${LOG_FILE}.${i + 1}`
      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile)
      }
    }

    // 将当前日志文件重命名为 .1
    fs.renameSync(LOG_FILE, `${LOG_FILE}.1`)
  } catch {
    // 忽略轮转错误
  }
}

/**
 * 检查是否需要轮转
 * @description 使用计数器减少 I/O 操作，每 ROTATION_CHECK_INTERVAL 次写入检查一次
 */
function checkRotation(): void {
  writeCount++
  if (writeCount >= ROTATION_CHECK_INTERVAL) {
    writeCount = 0
    rotateLogFile()
  }
}

/**
 * 初始化日志系统
 * @description 在首次写入时执行：创建目录、清理旧日志、检查轮转
 */
function initializeIfNeeded(): void {
  if (initialized) return
  initialized = true

  ensureLogDir()
  cleanupOldLogs()
  rotateLogFile() // 启动时强制检查一次
}

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * 写入日志到文件
 * @param level - 日志级别
 * @param args - 日志内容
 */
function writeToFile(level: string, ...args: unknown[]): void {
  try {
    initializeIfNeeded()
    checkRotation()

    const timestamp = formatTimestamp()
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') return arg
        if (arg instanceof Error) return `${arg.message}\n${arg.stack}`
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      })
      .join(' ')

    const logLine = `[${timestamp}] [${level}] ${message}\n`

    fs.appendFileSync(LOG_FILE, logLine, { encoding: 'utf8' })
  } catch {
    // 如果写入失败，忽略错误，避免影响主程序
  }
}

// ==================== 日志器 ====================

/** 保存原始的 console 方法 */
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
}

/** 日志器实例 */
export const logger = {
  log: (...args: unknown[]): void => {
    originalConsole.log(...args)
    writeToFile('INFO', ...args)
  },
  error: (...args: unknown[]): void => {
    originalConsole.error(...args)
    writeToFile('ERROR', ...args)
  },
  warn: (...args: unknown[]): void => {
    originalConsole.warn(...args)
    writeToFile('WARN', ...args)
  },
  info: (...args: unknown[]): void => {
    originalConsole.info(...args)
    writeToFile('INFO', ...args)
  },
  debug: (...args: unknown[]): void => {
    originalConsole.debug(...args)
    writeToFile('DEBUG', ...args)
  }
}

// ==================== 导出函数 ====================

/**
 * 重定向全局 console 到日志器
 */
export function redirectConsoleToLogger(): void {
  console.log = logger.log
  console.error = logger.error
  console.warn = logger.warn
  console.info = logger.info
  console.debug = logger.debug
}

/**
 * 获取日志文件路径
 */
export function getLogFilePath(): string {
  return LOG_FILE
}

/**
 * 获取日志目录路径
 */
export function getLogDir(): string {
  return LOG_DIR
}

/**
 * 手动触发日志清理
 * @description 可在需要时手动调用，清理过期日志并检查轮转
 */
export function cleanupLogs(): void {
  cleanupOldLogs()
  rotateLogFile()
}
