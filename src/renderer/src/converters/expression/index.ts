/**
 * 表达式转换器模块入口
 */

// 解析器
export {
  parseExpression,
  stringifyExpression,
  stringifyLogicalExpression,
  createCssExpression,
  createXPathExpression,
  createJsonExpression,
  createJsExpression,
  mergeReplaceRules,
  type ParseResult
} from './parser'

// JSOUP 转换
export {
  isJsoupDefaultSyntax,
  jsoupToCss,
  jsoupToXPath,
  convertJsoupDefault,
  convertAllJsoupDefault
} from './jsoup'

// 变量转换
export {
  VariableConverter,
  convertAnyReaderVariables,
  convertToAnyReaderVariables,
  convertLegadoVariables,
  convertToLegadoVariables,
  handleReversePrefix,
  addReversePrefix,
  convertLegadoJsTag,
  convertToLegadoJsTag,
  normalizeAnyReaderExpression,
  normalizeLegadoExpression,
  denormalizeToAnyReader,
  denormalizeToLegado,
  parseContextVariable,
  resolveContextVariable,
  replaceVariables,
  extractAllVariableNames
} from './variables'

// 验证器
export {
  ExpressionValidator,
  type ValidationError,
  type ValidationWarning,
  type ExpressionValidationResult
} from './validator'

import {
  normalizeExpression,
  detectExpressionType,
  type ExpressionType
} from '../../types/expression'
import { convertJsoupDefault, isJsoupDefaultSyntax } from './jsoup'
import {
  normalizeAnyReaderExpression,
  normalizeLegadoExpression,
  denormalizeToAnyReader,
  denormalizeToLegado
} from './variables'

/**
 * 完整的表达式标准化
 * 将任意格式的表达式转换为通用格式
 *
 * @param expr 原始表达式
 * @param sourceFormat 来源格式
 * @returns 标准化后的表达式
 */
export function normalizeExpressionFull(
  expr: string,
  sourceFormat: 'any-reader' | 'legado'
): string {
  if (!expr) return expr

  let result = expr

  // 1. 处理 JSOUP Default 语法（仅 Legado）
  if (sourceFormat === 'legado' && isJsoupDefaultSyntax(result)) {
    result = convertJsoupDefault(result)
  }

  // 2. 处理平台特定语法
  if (sourceFormat === 'any-reader') {
    result = normalizeAnyReaderExpression(result)
  } else if (sourceFormat === 'legado') {
    result = normalizeLegadoExpression(result)
  }

  // 3. 标准化前缀
  result = normalizeExpression(result)

  return result
}

/**
 * 将通用格式表达式转换为目标格式
 *
 * @param expr 通用格式表达式
 * @param targetFormat 目标格式
 * @returns 目标格式的表达式
 */
export function denormalizeExpressionFull(
  expr: string,
  targetFormat: 'any-reader' | 'legado'
): string {
  if (!expr) return expr

  if (targetFormat === 'any-reader') {
    return denormalizeToAnyReader(expr)
  } else {
    return denormalizeToLegado(expr)
  }
}

/**
 * 表达式转换器类
 * 提供完整的表达式转换功能
 */
export class ExpressionConverter {
  /**
   * 标准化表达式
   */
  static normalize(expr: string, sourceFormat: 'any-reader' | 'legado'): string {
    return normalizeExpressionFull(expr, sourceFormat)
  }

  /**
   * 反标准化表达式
   */
  static denormalize(expr: string, targetFormat: 'any-reader' | 'legado'): string {
    return denormalizeExpressionFull(expr, targetFormat)
  }

  /**
   * 检测表达式类型
   */
  static detectType(expr: string): ExpressionType {
    return detectExpressionType(expr)
  }

  /**
   * 批量标准化表达式
   */
  static normalizeAll(
    exprs: Record<string, string | undefined>,
    sourceFormat: 'any-reader' | 'legado'
  ): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {}

    for (const [key, value] of Object.entries(exprs)) {
      result[key] = value ? normalizeExpressionFull(value, sourceFormat) : undefined
    }

    return result
  }

  /**
   * 批量反标准化表达式
   */
  static denormalizeAll(
    exprs: Record<string, string | undefined>,
    targetFormat: 'any-reader' | 'legado'
  ): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {}

    for (const [key, value] of Object.entries(exprs)) {
      result[key] = value ? denormalizeExpressionFull(value, targetFormat) : undefined
    }

    return result
  }
}
