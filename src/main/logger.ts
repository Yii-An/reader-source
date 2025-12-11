import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// 日志文件路径
const LOG_DIR = path.join(app.getPath('userData'), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')

// 最大日志文件大小 (5MB)
const MAX_LOG_SIZE = 5 * 1024 * 1024

// 保留的旧日志文件数量
const MAX_LOG_FILES = 3

// 确保日志目录存在
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

// 日志文件轮转
function rotateLogFile(): void {
  try {
    if (!fs.existsSync(LOG_FILE)) return

    const stats = fs.statSync(LOG_FILE)
    if (stats.size < MAX_LOG_SIZE) return

    // 轮转旧日志文件
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldFile = `${LOG_FILE}.${i}`
      const newFile = `${LOG_FILE}.${i + 1}`
      if (fs.existsSync(oldFile)) {
        if (i === MAX_LOG_FILES - 1) {
          fs.unlinkSync(oldFile)
        } else {
          fs.renameSync(oldFile, newFile)
        }
      }
    }

    // 将当前日志文件重命名
    fs.renameSync(LOG_FILE, `${LOG_FILE}.1`)
  } catch {
    // 忽略轮转错误
  }
}

// 格式化时间戳
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

// 写入日志到文件
function writeToFile(level: string, ...args: unknown[]): void {
  try {
    ensureLogDir()
    rotateLogFile()

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

// 保存原始的 console 方法
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
}

// 创建日志器
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

// 重定向全局 console 到日志器
export function redirectConsoleToLogger(): void {
  console.log = logger.log
  console.error = logger.error
  console.warn = logger.warn
  console.info = logger.info
  console.debug = logger.debug
}

// 获取日志文件路径
export function getLogFilePath(): string {
  return LOG_FILE
}

// 获取日志目录路径
export function getLogDir(): string {
  return LOG_DIR
}
