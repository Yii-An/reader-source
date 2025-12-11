/**
 * 规则转换器模块入口
 * 提供规则格式检测和转换功能
 */

export * from './base'
export * from './any-reader'
export * from './legado'

import type { UniversalRule } from '../types/universal'
import type { Rule } from '../types'
import type { LegadoRule } from '../types/legado'
import { AnyReaderConverter, anyReaderConverter } from './any-reader'
import { LegadoConverter, legadoConverter } from './legado'
import type { ConvertOptions } from './base'

/**
 * 规则格式类型
 */
export type RuleFormat = 'any-reader' | 'legado' | 'universal' | 'unknown'

/**
 * 检测规则格式
 * @param rule 未知格式的规则
 * @returns 规则格式
 */
export function detectRuleFormat(rule: unknown): RuleFormat {
  if (!rule || typeof rule !== 'object') {
    return 'unknown'
  }

  // 检测 Legado 格式
  if (legadoConverter.detect(rule)) {
    return 'legado'
  }

  // 检测 any-reader 格式
  if (anyReaderConverter.detect(rule)) {
    return 'any-reader'
  }

  // 检测通用格式
  const r = rule as Record<string, unknown>
  if (r._meta && typeof r._meta === 'object') {
    const meta = r._meta as Record<string, unknown>
    if (meta.sourceFormat === 'universal') {
      return 'universal'
    }
  }

  return 'unknown'
}

/**
 * 将任意格式规则转换为通用规则
 * @param rule 任意格式的规则
 * @param options 转换选项
 * @returns 通用规则，如果无法识别格式则返回 null
 */
export function toUniversalRule(rule: unknown, options?: ConvertOptions): UniversalRule | null {
  const format = detectRuleFormat(rule)

  switch (format) {
    case 'any-reader':
      return anyReaderConverter.toUniversal(rule as Rule, options)
    case 'legado':
      return legadoConverter.toUniversal(rule as LegadoRule, options)
    case 'universal':
      return rule as UniversalRule
    default:
      return null
  }
}

/**
 * 将通用规则转换为指定格式
 * @param rule 通用规则
 * @param targetFormat 目标格式
 * @param options 转换选项
 * @returns 目标格式规则
 */
export function fromUniversalRule(
  rule: UniversalRule,
  targetFormat: 'any-reader' | 'legado',
  options?: ConvertOptions
): Rule | LegadoRule {
  switch (targetFormat) {
    case 'any-reader':
      return anyReaderConverter.fromUniversal(rule, options)
    case 'legado':
      return legadoConverter.fromUniversal(rule, options)
  }
}

/**
 * 智能转换规则
 * @param rule 任意格式的规则
 * @param targetFormat 目标格式
 * @param options 转换选项
 * @returns 转换后的规则
 */
export function convertRule(
  rule: unknown,
  targetFormat: 'any-reader' | 'legado' | 'universal',
  options?: ConvertOptions
): Rule | LegadoRule | UniversalRule | null {
  // 先转为通用格式
  const universal = toUniversalRule(rule, options)
  if (!universal) {
    return null
  }

  // 如果目标就是通用格式，直接返回
  if (targetFormat === 'universal') {
    return universal
  }

  // 转换为目标格式
  return fromUniversalRule(universal, targetFormat, options)
}

/**
 * 批量转换规则
 * @param rules 规则数组
 * @param targetFormat 目标格式
 * @param options 转换选项
 * @returns 转换结果数组
 */
export function convertRules(
  rules: unknown[],
  targetFormat: 'any-reader' | 'legado' | 'universal',
  options?: ConvertOptions
): Array<{
  success: boolean
  rule?: Rule | LegadoRule | UniversalRule
  error?: string
  originalIndex: number
}> {
  return rules.map((rule, index) => {
    try {
      const converted = convertRule(rule, targetFormat, options)
      if (converted) {
        return { success: true, rule: converted, originalIndex: index }
      } else {
        return { success: false, error: '无法识别规则格式', originalIndex: index }
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : '转换失败',
        originalIndex: index
      }
    }
  })
}

/**
 * 导出转换器实例
 */
export { AnyReaderConverter, LegadoConverter, anyReaderConverter, legadoConverter }
