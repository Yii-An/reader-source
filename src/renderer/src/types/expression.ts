/**
 * 通用表达式类型定义
 * 用于解析和转换不同平台的规则表达式
 */

/**
 * 表达式类型枚举
 */
export type ExpressionType = 'css' | 'xpath' | 'json' | 'js' | 'regex' | 'literal' | 'logical'

/**
 * 逻辑运算符类型
 */
export type LogicalOperator = '||' | '&&'

/**
 * 正则替换配置
 */
export interface ReplaceConfig {
  pattern: string
  replacement: string
  flags?: string // g, i, m 等
}

/**
 * 后处理操作配置
 */
export interface PostProcessConfig {
  // 属性提取 (CSS/XPath)
  attr?: string // 如: text, html, href, src

  // 正则替换
  replace?: ReplaceConfig[]

  // 索引选择
  index?: number | 'first' | 'last' | 'all'
}

/**
 * 逻辑表达式节点
 */
export interface LogicalExpressionNode {
  type: 'logical'
  operator: LogicalOperator
  left: UniversalExpression | LogicalExpressionNode
  right: UniversalExpression | LogicalExpressionNode
}

/**
 * 通用表达式结构
 */
export interface UniversalExpression {
  // 类型标识
  type: ExpressionType

  // 表达式内容
  value: string

  // 后处理操作
  postProcess?: PostProcessConfig

  // 级联规则（链式处理）
  next?: UniversalExpression

  // 逻辑表达式支持
  logical?: LogicalExpressionNode
}

/**
 * 表达式解析结果
 */
export interface ExpressionParseResult {
  success: boolean
  expression?: UniversalExpression
  error?: string
}

/**
 * 表达式前缀映射
 */
export const EXPRESSION_PREFIXES: Record<ExpressionType, string> = {
  css: '@css:',
  xpath: '@xpath:',
  json: '@json:',
  js: '@js:',
  regex: '@regex:',
  literal: '',
  logical: '' // 逻辑表达式没有特定前缀
}

/**
 * Legado 特殊前缀映射到通用类型
 */
export const LEGADO_PREFIX_MAP: Record<string, ExpressionType> = {
  '@css:': 'css',
  '@XPath:': 'xpath',
  '@xpath:': 'xpath',
  '@json:': 'json',
  '@js:': 'js'
}

/**
 * CSS 属性提取关键字
 */
export const CSS_ATTR_KEYWORDS = [
  'text',
  'html',
  'innerHtml',
  'outerHtml',
  'href',
  'src',
  'data-original',
  'alt',
  'title',
  'class',
  'id'
] as const

export type CssAttrKeyword = (typeof CSS_ATTR_KEYWORDS)[number]

// ============================================================
// 变量类型定义
// ============================================================

/**
 * 变量类型枚举
 */
export enum VariableType {
  // 基础变量
  HOST = 'host', // 域名
  KEYWORD = 'keyword', // 搜索关键词
  PAGE = 'page', // 页码

  // URL相关
  BASE_URL = 'baseUrl', // 基础 URL
  CURRENT_URL = 'currentUrl', // 当前页面 URL

  // 上下文变量（上一步结果）
  RESULT = 'result', // 上一步完整结果
  RESULT_URL = 'result.url',
  RESULT_NAME = 'result.name',
  RESULT_COVER = 'result.cover',
  RESULT_AUTHOR = 'result.author',

  // 时间变量
  TIMESTAMP = 'timestamp', // 当前时间戳
  DATE = 'date', // 当前日期

  // 用户变量
  COOKIE = 'cookie', // Cookie
  USER_AGENT = 'userAgent' // UA
}

/**
 * 变量映射配置
 */
export interface VariableMapping {
  universal: string // 通用格式 {{xxx}}
  anyReader?: string // any-reader 格式 $xxx
  legado?: string // Legado 格式 {{xxx}} 或特殊格式
}

/**
 * 变量映射表
 */
export const VARIABLE_MAPPINGS: Record<VariableType, VariableMapping> = {
  [VariableType.HOST]: {
    universal: '{{host}}',
    anyReader: '$host',
    legado: '{{baseUrl}}'
  },
  [VariableType.KEYWORD]: {
    universal: '{{keyword}}',
    anyReader: '$keyword',
    legado: '{{key}}'
  },
  [VariableType.PAGE]: {
    universal: '{{page}}',
    anyReader: '$page',
    legado: '{{page}}'
  },
  [VariableType.BASE_URL]: {
    universal: '{{baseUrl}}',
    anyReader: '$host',
    legado: '{{baseUrl}}'
  },
  [VariableType.CURRENT_URL]: {
    universal: '{{currentUrl}}',
    legado: '{{url}}'
  },
  [VariableType.RESULT]: {
    universal: '{{result}}',
    legado: '{{result}}'
  },
  [VariableType.RESULT_URL]: {
    universal: '{{result.url}}',
    legado: '{{result.bookUrl}}'
  },
  [VariableType.RESULT_NAME]: {
    universal: '{{result.name}}',
    legado: '{{result.name}}'
  },
  [VariableType.RESULT_COVER]: {
    universal: '{{result.cover}}',
    legado: '{{result.coverUrl}}'
  },
  [VariableType.RESULT_AUTHOR]: {
    universal: '{{result.author}}',
    legado: '{{result.author}}'
  },
  [VariableType.TIMESTAMP]: {
    universal: '{{timestamp}}',
    legado: '{{System.currentTimeMillis()}}'
  },
  [VariableType.DATE]: {
    universal: '{{date}}',
    legado: '{{java.time.LocalDate.now()}}'
  },
  [VariableType.COOKIE]: {
    universal: '{{cookie}}',
    legado: '{{cookie}}'
  },
  [VariableType.USER_AGENT]: {
    universal: '{{userAgent}}',
    legado: '{{userAgent}}'
  }
}

/**
 * 检测表达式类型
 * @param expr 表达式字符串
 * @returns 表达式类型
 */
export function detectExpressionType(expr: string): ExpressionType {
  if (!expr || typeof expr !== 'string') {
    return 'literal'
  }

  const trimmed = expr.trim()

  // 检查标准前缀
  if (trimmed.startsWith('@css:')) return 'css'
  if (trimmed.startsWith('@xpath:') || trimmed.startsWith('@XPath:')) return 'xpath'
  if (trimmed.startsWith('@json:')) return 'json'
  if (trimmed.startsWith('@js:')) return 'js'
  if (trimmed.startsWith('@regex:') || trimmed.startsWith('@filter:')) return 'regex'

  // 检查 Legado 风格的隐式前缀
  if (trimmed.startsWith('//') || trimmed.startsWith('(/')) return 'xpath'
  if (trimmed.startsWith('$.') || trimmed.startsWith('$[')) return 'json'
  if (trimmed.startsWith('<js>') && trimmed.includes('</js>')) return 'js'

  // 检查是否像 CSS 选择器（包含常见 CSS 字符）
  if (/^[.#[]/.test(trimmed) || /^[a-z]+[.#[]/i.test(trimmed)) {
    return 'css'
  }

  // 默认为字面量
  return 'literal'
}

/**
 * 标准化表达式前缀
 * 将各种格式的表达式转换为统一的 @type: 格式
 * @param expr 原始表达式
 * @returns 标准化后的表达式
 */
export function normalizeExpression(expr: string): string {
  if (!expr || typeof expr !== 'string') {
    return expr
  }

  const trimmed = expr.trim()
  const type = detectExpressionType(trimmed)

  // 如果已经有标准前缀，返回原表达式（统一小写）
  if (trimmed.startsWith('@css:')) return trimmed
  if (trimmed.startsWith('@xpath:')) return trimmed
  if (trimmed.startsWith('@json:')) return trimmed
  if (trimmed.startsWith('@js:')) return trimmed
  if (trimmed.startsWith('@regex:')) return trimmed

  // 转换 Legado 风格前缀
  if (trimmed.startsWith('@XPath:')) {
    return '@xpath:' + trimmed.slice(7)
  }
  if (trimmed.startsWith('@filter:')) {
    return '@regex:' + trimmed.slice(8)
  }

  // 转换隐式前缀
  if (type === 'xpath' && (trimmed.startsWith('//') || trimmed.startsWith('(/'))) {
    return '@xpath:' + trimmed
  }
  if (type === 'json' && (trimmed.startsWith('$.') || trimmed.startsWith('$['))) {
    return '@json:' + trimmed
  }
  if (type === 'js' && trimmed.startsWith('<js>')) {
    // 提取 <js>...</js> 中的内容
    const match = trimmed.match(/<js>([\s\S]*?)<\/js>/)
    if (match) {
      return '@js:' + match[1].trim()
    }
  }

  // 对于明确的 CSS 选择器添加前缀（必须以 . # [ 开头，或者是 tag.class 格式）
  // 但不对裸字段名（如 author, name）添加前缀
  if (type === 'css' && /^[.#[]/.test(trimmed)) {
    return '@css:' + trimmed
  }

  // 字面量和其他不确定类型不添加前缀
  return trimmed
}

/**
 * 移除表达式前缀，获取纯内容
 * @param expr 表达式
 * @returns 去除前缀后的内容
 */
export function stripExpressionPrefix(expr: string): string {
  if (!expr || typeof expr !== 'string') {
    return expr
  }

  const trimmed = expr.trim()

  for (const prefix of Object.values(EXPRESSION_PREFIXES)) {
    if (prefix && trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length)
    }
  }

  // 处理大写的 Legado 前缀
  if (trimmed.startsWith('@XPath:')) {
    return trimmed.slice(7)
  }
  if (trimmed.startsWith('@filter:')) {
    return trimmed.slice(8)
  }

  return trimmed
}
