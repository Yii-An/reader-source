/**
 * 规则表达式类型定义
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
  flags?: string
}

/**
 * 后处理操作配置
 */
export interface PostProcessConfig {
  attr?: string
  replace?: ReplaceConfig[]
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
  type: ExpressionType
  value: string
  postProcess?: PostProcessConfig
  next?: UniversalExpression
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
  logical: ''
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
 * 变量类型枚举
 */
export enum VariableType {
  HOST = 'host',
  KEYWORD = 'keyword',
  PAGE = 'page',
  BASE_URL = 'baseUrl',
  CURRENT_URL = 'currentUrl',
  RESULT = 'result',
  RESULT_URL = 'result.url',
  RESULT_NAME = 'result.name',
  RESULT_COVER = 'result.cover',
  RESULT_AUTHOR = 'result.author',
  TIMESTAMP = 'timestamp',
  DATE = 'date',
  COOKIE = 'cookie',
  USER_AGENT = 'userAgent'
}

/**
 * 变量格式（统一使用 {{xxx}} 格式）
 */
export const VARIABLE_FORMATS: Record<VariableType, string> = {
  [VariableType.HOST]: '{{host}}',
  [VariableType.KEYWORD]: '{{keyword}}',
  [VariableType.PAGE]: '{{page}}',
  [VariableType.BASE_URL]: '{{baseUrl}}',
  [VariableType.CURRENT_URL]: '{{currentUrl}}',
  [VariableType.RESULT]: '{{result}}',
  [VariableType.RESULT_URL]: '{{result.url}}',
  [VariableType.RESULT_NAME]: '{{result.name}}',
  [VariableType.RESULT_COVER]: '{{result.cover}}',
  [VariableType.RESULT_AUTHOR]: '{{result.author}}',
  [VariableType.TIMESTAMP]: '{{timestamp}}',
  [VariableType.DATE]: '{{date}}',
  [VariableType.COOKIE]: '{{cookie}}',
  [VariableType.USER_AGENT]: '{{userAgent}}'
}

/**
 * 检测表达式类型
 */
export function detectExpressionType(expr: string): ExpressionType {
  if (!expr || typeof expr !== 'string') {
    return 'literal'
  }

  const trimmed = expr.trim()

  if (trimmed.startsWith('@css:')) return 'css'
  if (trimmed.startsWith('@xpath:') || trimmed.startsWith('@XPath:')) return 'xpath'
  if (trimmed.startsWith('@json:')) return 'json'
  if (trimmed.startsWith('@js:')) return 'js'
  if (trimmed.startsWith('@regex:')) return 'regex'

  if (trimmed.startsWith('//') || trimmed.startsWith('(/')) return 'xpath'
  if (trimmed.startsWith('$.') || trimmed.startsWith('$[')) return 'json'
  if (trimmed.startsWith('<js>') && trimmed.includes('</js>')) return 'js'

  if (/^[.#[]/.test(trimmed) || /^[a-z]+[.#[]/i.test(trimmed)) {
    return 'css'
  }

  return 'literal'
}

/**
 * 标准化表达式前缀
 */
export function normalizeExpression(expr: string): string {
  if (!expr || typeof expr !== 'string') {
    return expr
  }

  const trimmed = expr.trim()
  const type = detectExpressionType(trimmed)

  if (trimmed.startsWith('@css:')) return trimmed
  if (trimmed.startsWith('@xpath:')) return trimmed
  if (trimmed.startsWith('@json:')) return trimmed
  if (trimmed.startsWith('@js:')) return trimmed
  if (trimmed.startsWith('@regex:')) return trimmed

  if (trimmed.startsWith('@XPath:')) {
    return '@xpath:' + trimmed.slice(7)
  }

  if (type === 'xpath' && (trimmed.startsWith('//') || trimmed.startsWith('(/'))) {
    return '@xpath:' + trimmed
  }
  if (type === 'json' && (trimmed.startsWith('$.') || trimmed.startsWith('$['))) {
    return '@json:' + trimmed
  }
  if (type === 'js' && trimmed.startsWith('<js>')) {
    const match = trimmed.match(/<js>([\s\S]*?)<\/js>/)
    if (match) {
      return '@js:' + match[1].trim()
    }
  }

  if (type === 'css' && /^[.#[]/.test(trimmed)) {
    return '@css:' + trimmed
  }

  return trimmed
}

/**
 * 移除表达式前缀
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

  if (trimmed.startsWith('@XPath:')) {
    return trimmed.slice(7)
  }

  return trimmed
}
