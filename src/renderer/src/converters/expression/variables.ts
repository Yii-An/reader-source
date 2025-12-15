// 变量语法转换器
// 处理不同平台之间的变量语法差异

import { VariableType, VARIABLE_MAPPINGS } from '../../types/expression'

/**
 * 转义正则特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 变量转换器类
 */
export class VariableConverter {
  /**
   * 将 any-reader 变量转换为通用格式
   */
  static fromAnyReader(expr: string): string {
    if (!expr) return expr

    let result = expr

    for (const mapping of Object.values(VARIABLE_MAPPINGS)) {
      if (mapping.anyReader) {
        // 使用单词边界确保精确匹配
        const regex = new RegExp(escapeRegex(mapping.anyReader) + '\\b', 'g')
        result = result.replace(regex, mapping.universal)
      }
    }

    return result
  }

  /**
   * 将 Legado 变量转换为通用格式
   */
  static fromLegado(expr: string): string {
    if (!expr) return expr

    let result = expr

    for (const mapping of Object.values(VARIABLE_MAPPINGS)) {
      if (mapping.legado && mapping.legado !== mapping.universal) {
        result = result.replace(new RegExp(escapeRegex(mapping.legado), 'g'), mapping.universal)
      }
    }

    return result
  }

  /**
   * 将通用变量转换为 any-reader 格式
   */
  static toAnyReader(expr: string): string {
    if (!expr) return expr

    let result = expr

    for (const mapping of Object.values(VARIABLE_MAPPINGS)) {
      if (mapping.anyReader) {
        result = result.replace(new RegExp(escapeRegex(mapping.universal), 'g'), mapping.anyReader)
      }
    }

    return result
  }

  /**
   * 将通用变量转换为 Legado 格式
   */
  static toLegado(expr: string): string {
    if (!expr) return expr

    let result = expr

    for (const mapping of Object.values(VARIABLE_MAPPINGS)) {
      if (mapping.legado) {
        result = result.replace(new RegExp(escapeRegex(mapping.universal), 'g'), mapping.legado)
      }
    }

    return result
  }

  /**
   * 提取表达式中的所有变量
   */
  static extractVariables(expr: string): VariableType[] {
    if (!expr) return []

    const found: VariableType[] = []

    for (const [type, mapping] of Object.entries(VARIABLE_MAPPINGS)) {
      if (expr.includes(mapping.universal)) {
        found.push(type as VariableType)
      }
    }

    return found
  }

  /**
   * 验证变量是否有效
   */
  static validateVariables(expr: string): {
    valid: boolean
    unknownVariables: string[]
  } {
    const variablePattern = /\{\{([^}]+)\}\}/g
    const unknownVariables: string[] = []

    let match
    while ((match = variablePattern.exec(expr)) !== null) {
      const varName = match[1]
      const isKnown = Object.values(VARIABLE_MAPPINGS).some((m) => m.universal === `{{${varName}}}`)
      if (!isKnown) {
        unknownVariables.push(varName)
      }
    }

    return {
      valid: unknownVariables.length === 0,
      unknownVariables
    }
  }
}

// ============================================================
// 兼容旧 API 的包装函数
// ============================================================

/**
 * 将 any-reader 变量转换为通用格式
 */
export function convertAnyReaderVariables(expr: string): string {
  return VariableConverter.fromAnyReader(expr)
}

/**
 * 将通用变量转换为 any-reader 格式
 */
export function convertToAnyReaderVariables(expr: string): string {
  return VariableConverter.toAnyReader(expr)
}

/**
 * 将 Legado 变量转换为通用格式
 */
export function convertLegadoVariables(expr: string): string {
  return VariableConverter.fromLegado(expr)
}

/**
 * 将通用变量转换为 Legado 格式
 */
export function convertToLegadoVariables(expr: string): string {
  return VariableConverter.toLegado(expr)
}

/**
 * 处理列表反序标记
 */
export function handleReversePrefix(expr: string): { expr: string; reversed: boolean } {
  if (!expr) return { expr, reversed: false }

  const trimmed = expr.trim()

  // Legado 使用 - 前缀表示反序
  if (trimmed.startsWith('-')) {
    return {
      expr: trimmed.slice(1).trim(),
      reversed: true
    }
  }

  // 通用格式使用 @reverse 后缀
  if (trimmed.endsWith('@reverse')) {
    return {
      expr: trimmed.slice(0, -8).trim(),
      reversed: true
    }
  }

  return { expr, reversed: false }
}

/**
 * 添加反序标记
 */
export function addReversePrefix(expr: string, format: 'universal' | 'legado'): string {
  if (!expr) return expr

  if (format === 'legado') {
    return '-' + expr
  } else {
    return expr + '@reverse'
  }
}

/**
 * 处理 Legado 的 <js></js> 标签
 */
export function convertLegadoJsTag(expr: string): string {
  if (!expr) return expr

  // <js>code</js> -> @js:code
  const jsMatch = expr.match(/<js>([\s\S]*?)<\/js>/g)
  if (jsMatch) {
    let result = expr
    for (const match of jsMatch) {
      const code = match.slice(4, -5) // 移除 <js> 和 </js>
      result = result.replace(match, `@js:${code.trim()}`)
    }
    return result
  }

  return expr
}

/**
 * 将通用格式的 JS 表达式转换为 Legado 格式
 */
export function convertToLegadoJsTag(expr: string): string {
  if (!expr) return expr

  // 如果是纯 JS 表达式，转换为 <js></js> 格式
  if (expr.startsWith('@js:')) {
    const code = expr.slice(4)
    return `<js>${code}</js>`
  }

  return expr
}

/**
 * 综合转换：any-reader 表达式到通用格式
 */
export function normalizeAnyReaderExpression(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertAnyReaderVariables(result)

  // @filter: -> @regex:
  result = result.replace(/@filter:/g, '@regex:')

  return result
}

/**
 * 综合转换：Legado 表达式到通用格式
 */
export function normalizeLegadoExpression(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertLegadoVariables(result)

  // 转换 JS 标签
  result = convertLegadoJsTag(result)

  // @XPath: -> @xpath:
  result = result.replace(/@XPath:/g, '@xpath:')

  return result
}

/**
 * 综合转换：通用格式到 any-reader 表达式
 */
export function denormalizeToAnyReader(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertToAnyReaderVariables(result)

  // @regex: -> @filter:
  result = result.replace(/@regex:/g, '@filter:')

  return result
}

/**
 * 综合转换：通用格式到 Legado 表达式
 */
export function denormalizeToLegado(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertToLegadoVariables(result)

  return result
}

// ============================================================
// 上下文变量解析
// ============================================================

/**
 * 解析上下文变量路径
 * @param varName 变量名（如 "result.url"）
 * @returns 解析后的上下文和路径，或 null（如果不是上下文变量）
 */
export function parseContextVariable(varName: string): {
  context: string
  path: string[]
} | null {
  if (!varName || !varName.includes('.')) return null

  const parts = varName.split('.')
  return {
    context: parts[0],
    path: parts.slice(1)
  }
}

/**
 * 从上下文对象中获取变量值
 * @param varName 变量名（如 "result.url"）
 * @param context 上下文对象
 * @returns 变量值
 */
export function resolveContextVariable(varName: string, context: Record<string, unknown>): unknown {
  const parsed = parseContextVariable(varName)
  if (!parsed) return undefined

  let value: unknown = context[parsed.context]

  for (const key of parsed.path) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return value
}

/**
 * 替换表达式中的所有变量
 * @param expr 表达式
 * @param context 上下文对象
 * @returns 替换后的表达式
 */
export function replaceVariables(expr: string, context: Record<string, unknown>): string {
  if (!expr) return expr

  const variablePattern = /\{\{([^}]+)\}\}/g

  return expr.replace(variablePattern, (match, varName) => {
    // 先检查是否是已知的基本变量
    for (const mapping of Object.values(VARIABLE_MAPPINGS)) {
      if (mapping.universal === match) {
        const contextKey = varName.toLowerCase()
        if (contextKey in context) {
          const value = context[contextKey]
          return String(value ?? '')
        }
      }
    }

    // 尝试解析上下文变量
    const value = resolveContextVariable(varName, context)
    if (value !== undefined) {
      return String(value)
    }

    // 未找到变量，保持原样
    return match
  })
}

/**
 * 提取表达式中所有变量名
 * @param expr 表达式
 * @returns 变量名数组
 */
export function extractAllVariableNames(expr: string): string[] {
  if (!expr) return []

  const variablePattern = /\{\{([^}]+)\}\}/g
  const names: string[] = []

  let match
  while ((match = variablePattern.exec(expr)) !== null) {
    names.push(match[1])
  }

  return names
}
