/**
 * 表达式解析器
 * 将表达式字符串解析为结构化对象，并支持序列化回字符串
 */

import type {
  UniversalExpression,
  ExpressionType,
  PostProcessConfig,
  ReplaceConfig,
  LogicalOperator,
  LogicalExpressionNode
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
 * 分割逻辑运算符
 * 注意：需要处理嵌套括号和字符串内的运算符
 */
function splitByLogicalOperators(expr: string): {
  parts: string[]
  operators: LogicalOperator[]
} {
  const parts: string[] = []
  const operators: LogicalOperator[] = []
  let current = ''
  let depth = 0 // 括号深度
  let inString = false
  let stringChar = ''

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    const nextChar = expr[i + 1]
    const prevChar = expr[i - 1]

    // 处理字符串
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    // 处理括号深度
    if (!inString) {
      if (char === '(' || char === '[' || char === '{') depth++
      if (char === ')' || char === ']' || char === '}') depth--
    }

    // 检测逻辑运算符（仅在顶层）
    if (!inString && depth === 0) {
      if (char === '|' && nextChar === '|') {
        parts.push(current.trim())
        operators.push('||')
        current = ''
        i++ // 跳过下一个字符
        continue
      }
      if (char === '&' && nextChar === '&') {
        parts.push(current.trim())
        operators.push('&&')
        current = ''
        i++
        continue
      }
    }

    current += char
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return { parts, operators }
}

/**
 * 构建逻辑表达式树
 */
function buildLogicalTree(
  parts: string[],
  operators: LogicalOperator[],
  originalExpr: string
): ParseResult {
  if (parts.length === 0) {
    return { success: false, error: '空表达式' }
  }

  if (parts.length === 1) {
    return parseSingleExpression(parts[0])
  }

  // 递归构建树（左结合）
  const firstResult = parseSingleExpression(parts[0])
  if (!firstResult.success || !firstResult.expression) {
    return firstResult
  }

  let currentNode: UniversalExpression | LogicalExpressionNode = firstResult.expression

  for (let i = 0; i < operators.length; i++) {
    const nextResult = parseSingleExpression(parts[i + 1])
    if (!nextResult.success || !nextResult.expression) {
      return nextResult
    }

    // 创建逻辑节点
    const logicalNode: LogicalExpressionNode = {
      type: 'logical',
      operator: operators[i],
      left: currentNode,
      right: nextResult.expression
    }

    currentNode = logicalNode
  }

  // 包装为 UniversalExpression
  const result: UniversalExpression = {
    type: 'logical',
    value: originalExpr,
    logical: currentNode as LogicalExpressionNode
  }

  return { success: true, expression: result }
}

/**
 * 解析逻辑表达式（包含 || 或 &&）
 */
function parseLogicalExpression(expr: string): ParseResult {
  const { parts, operators } = splitByLogicalOperators(expr)

  if (operators.length === 0) {
    // 没有逻辑运算符，按单个表达式处理
    return parseSingleExpression(expr)
  }

  return buildLogicalTree(parts, operators, expr)
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
 * 将逻辑表达式树序列化为字符串
 */
export function stringifyLogicalExpression(node: LogicalExpressionNode): string {
  const leftStr =
    node.left.type === 'logical'
      ? stringifyLogicalExpression(node.left as LogicalExpressionNode)
      : stringifyExpression(node.left as UniversalExpression)

  const rightStr =
    node.right.type === 'logical'
      ? stringifyLogicalExpression(node.right as LogicalExpressionNode)
      : stringifyExpression(node.right as UniversalExpression)

  return `${leftStr} ${node.operator} ${rightStr}`
}

/**
 * 将结构化表达式序列化为字符串
 * @param expression 结构化表达式
 * @returns 表达式字符串
 */
export function stringifyExpression(expression: UniversalExpression): string {
  // 如果是逻辑表达式
  if (expression.type === 'logical' && expression.logical) {
    return stringifyLogicalExpression(expression.logical)
  }

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
