/**
 * 类型守卫函数
 */

import type { UniversalRule } from './universal'

/**
 * 检查是否为有效规则
 */
export function isUniversalRule(obj: unknown): obj is UniversalRule {
  if (!obj || typeof obj !== 'object') return false
  const rule = obj as Record<string, unknown>
  return (
    typeof rule.id === 'string' && typeof rule.name === 'string' && typeof rule.host === 'string'
  )
}

/**
 * 检查规则是否有必要字段
 */
export function hasRequiredFields(rule: UniversalRule): boolean {
  return !!(rule.id && rule.name && rule.host)
}

/**
 * 检查规则是否启用
 */
export function isRuleEnabled(rule: UniversalRule): boolean {
  return rule.enabled !== false
}

/**
 * 检查规则是否有搜索功能
 */
export function hasSearchRule(rule: UniversalRule): boolean {
  return !!(rule.search?.enabled && rule.search?.url)
}

/**
 * 检查规则是否有发现功能
 */
export function hasDiscoverRule(rule: UniversalRule): boolean {
  return !!(rule.discover?.enabled && rule.discover?.url)
}

/**
 * 检查规则是否有章节功能
 */
export function hasChapterRule(rule: UniversalRule): boolean {
  return !!rule.chapter?.list
}

/**
 * 检查规则是否有正文功能
 */
export function hasContentRule(rule: UniversalRule): boolean {
  return !!rule.content?.items
}

/**
 * 验证规则完整性
 */
export function validateRuleCompleteness(rule: UniversalRule): string[] {
  const missing: string[] = []

  if (!hasRequiredFields(rule)) {
    missing.push('基本信息（id/name/host）')
  }

  if (!hasSearchRule(rule) && !hasDiscoverRule(rule)) {
    missing.push('搜索或发现功能')
  }

  if (!hasChapterRule(rule)) {
    missing.push('章节规则')
  }

  if (!hasContentRule(rule)) {
    missing.push('正文规则')
  }

  return missing
}
