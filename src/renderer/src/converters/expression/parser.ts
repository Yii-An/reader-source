/**
 * 表达式解析器
 * 将表达式字符串解析为结构化对象，并支持序列化回字符串
 */

import type {
  UniversalExpression,
  ExpressionType,
  PostProcessConfig,
  ReplaceConfig
} from '../../types/expression'
import { detectExpressionType, EXPRESSION_PREFIXES } from '../../types/expression'

/**
 * 解析结果
 */
export interface ParseResult {
  success: boolean
  expression?: UniversalExpression
  error?: string
}

/**
 * 解析表达式字符串为结构化对象
 * @param expr 表达式字符串
 * @returns 解析结果
 */
export function parseExpression(expr: string): ParseResult {
  if (!expr || typeof expr !== 'string') {
    return { success: false, error: '表达式不能为空' }
  }

  try {
    const trimmed = expr.trim()

    // 处理逻辑运算符分割的表达式
    if (trimmed.includes('||') || trimmed.includes('&&')) {
      return parseLogicalExpression(trimmed)
    }

    // 解析单个表达式
    return parseSingleExpression(trimmed)
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '解析失败'
    }
  }
}

/**
 * 解析逻辑表达式（包含 || 或 &&）
 */
function parseLogicalExpression(expr: string): ParseResult {
  // 简化处理：暂时作为单个表达式返回
  // 完整实现需要解析为表达式树
  const type = detectExpressionType(expr)

  return {
    success: true,
    expression: {
      type,
      value: stripPrefix(expr, type)
    }
  }
}

/**
 * 解析单个表达式
 */
function parseSingleExpression(expr: string): ParseResult {
  const type = detectExpressionType(expr)
  let value = stripPrefix(expr, type)
  const postProcess: PostProcessConfig = {}

  // 处理正则替换 ##pattern##replacement
  const replaceMatch = value.match(/##([^#]*)##([^#]*)$/)
  if (replaceMatch) {
    value = value.slice(0, -replaceMatch[0].length)
    postProcess.replace = [
      {
        pattern: replaceMatch[1],
        replacement: replaceMatch[2]
      }
    ]
  }

  // 处理 CSS 属性提取 @attr
  if (type === 'css') {
    const attrMatch = value.match(/@([a-zA-Z]+)$/)
    if (attrMatch) {
      value = value.slice(0, -attrMatch[0].length)
      postProcess.attr = attrMatch[1]
    }
  }

  // 处理索引选择 [n] 或 [-1]
  const indexMatch = value.match(/\[(-?\d+)\]$/)
  if (indexMatch) {
    value = value.slice(0, -indexMatch[0].length)
    postProcess.index = parseInt(indexMatch[1], 10)
  }

  const expression: UniversalExpression = {
    type,
    value
  }

  if (Object.keys(postProcess).length > 0) {
    expression.postProcess = postProcess
  }

  return { success: true, expression }
}

/**
 * 移除表达式前缀
 */
function stripPrefix(expr: string, type: ExpressionType): string {
  const prefix = EXPRESSION_PREFIXES[type]
  if (prefix && expr.startsWith(prefix)) {
    return expr.slice(prefix.length)
  }

  // 处理大写变体
  if (type === 'xpath' && expr.startsWith('@XPath:')) {
    return expr.slice(7)
  }
  if (type === 'regex' && expr.startsWith('@filter:')) {
    return expr.slice(8)
  }

  // 处理隐式前缀（如 // 开头的 XPath）
  return expr
}

/**
 * 将结构化表达式序列化为字符串
 * @param expression 结构化表达式
 * @returns 表达式字符串
 */
export function stringifyExpression(expression: UniversalExpression): string {
  const prefix = EXPRESSION_PREFIXES[expression.type]
  let result = prefix + expression.value

  // 添加索引
  if (expression.postProcess?.index !== undefined) {
    const idx = expression.postProcess.index
    if (typeof idx === 'number') {
      result += `[${idx}]`
    }
  }

  // 添加属性提取
  if (expression.postProcess?.attr) {
    result += `@${expression.postProcess.attr}`
  }

  // 添加正则替换
  if (expression.postProcess?.replace) {
    for (const r of expression.postProcess.replace) {
      result += `##${r.pattern}##${r.replacement}`
    }
  }

  // 处理级联规则
  if (expression.next) {
    result += ' && ' + stringifyExpression(expression.next)
  }

  return result
}

/**
 * 合并多个替换规则
 */
export function mergeReplaceRules(rules: ReplaceConfig[]): ReplaceConfig[] {
  // 去重并合并
  const seen = new Set<string>()
  return rules.filter((r) => {
    const key = `${r.pattern}::${r.replacement}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 创建简单的 CSS 表达式
 */
export function createCssExpression(selector: string, attr?: string): UniversalExpression {
  const expr: UniversalExpression = {
    type: 'css',
    value: selector
  }

  if (attr) {
    expr.postProcess = { attr }
  }

  return expr
}

/**
 * 创建简单的 XPath 表达式
 */
export function createXPathExpression(path: string): UniversalExpression {
  return {
    type: 'xpath',
    value: path
  }
}

/**
 * 创建简单的 JSONPath 表达式
 */
export function createJsonExpression(path: string): UniversalExpression {
  return {
    type: 'json',
    value: path
  }
}

/**
 * 创建 JavaScript 表达式
 */
export function createJsExpression(code: string): UniversalExpression {
  return {
    type: 'js',
    value: code
  }
}
