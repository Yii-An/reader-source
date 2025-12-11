/**
 * 通用表达式类型定义
 * 用于解析和转换不同平台的规则表达式
 */

/**
 * 表达式类型枚举
 */
export type ExpressionType = 'css' | 'xpath' | 'json' | 'js' | 'regex' | 'literal'

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
  literal: ''
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
  if (/^[.#\[]/.test(trimmed) || /^[a-z]+[.#\[]/i.test(trimmed)) {
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

  // CSS 选择器添加前缀
  if (type === 'css') {
    return '@css:' + trimmed
  }

  // 字面量不添加前缀
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
