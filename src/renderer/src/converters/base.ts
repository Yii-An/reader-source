/**
 * 规则转换器基础接口
 */

import type { UniversalRule } from '../types/universal'

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  field: string
  message: string
  code: string
}

/**
 * 转换选项
 */
export interface ConvertOptions {
  /** 是否保留原始数据用于无损转换 */
  preserveOriginal?: boolean
  /** 是否严格模式（遇到不支持的字段报错） */
  strict?: boolean
}

/**
 * 规则转换器基础接口
 * @template T 目标规则类型
 */
export interface RuleConverter<T> {
  /**
   * 将目标格式规则转换为通用规则
   * @param rule 目标格式规则
   * @param options 转换选项
   * @returns 通用规则
   */
  toUniversal(rule: T, options?: ConvertOptions): UniversalRule

  /**
   * 将通用规则转换为目标格式
   * @param rule 通用规则
   * @param options 转换选项
   * @returns 目标格式规则
   */
  fromUniversal(rule: UniversalRule, options?: ConvertOptions): T

  /**
   * 验证目标格式规则的有效性
   * @param rule 目标格式规则
   * @returns 验证结果
   */
  validate(rule: T): ValidationResult

  /**
   * 检测是否为目标格式的规则
   * @param rule 未知格式规则
   * @returns 是否为目标格式
   */
  detect(rule: unknown): rule is T
}

/**
 * 创建空的验证结果
 */
export function createValidationResult(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: []
  }
}

/**
 * 添加验证错误
 */
export function addValidationError(
  result: ValidationResult,
  field: string,
  message: string,
  code: string
): void {
  result.valid = false
  result.errors.push({ field, message, code })
}

/**
 * 添加验证警告
 */
export function addValidationWarning(
  result: ValidationResult,
  field: string,
  message: string,
  code: string
): void {
  result.warnings.push({ field, message, code })
}
