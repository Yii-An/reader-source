import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, set, del, keys } from 'idb-keyval'
import type { Rule } from '../types'
import type { UniversalRule } from '../types/universal'
import { createDefaultUniversalRule } from '../types/universal'
import {
  detectRuleFormat,
  anyReaderConverter,
  legadoConverter,
  type RuleFormat
} from '../converters'
import type { LegadoRule } from '../types/legado'

const STORAGE_PREFIX = 'rule_'

/**
 * 导入结果
 */
export interface ImportResult {
  success: number
  failed: number
  errors: string[]
  format: RuleFormat
}

/**
 * 导出格式
 */
export type ExportFormat = 'any-reader' | 'legado'

export const useSourceStore = defineStore('source', () => {
  // 使用 UniversalRule 作为内部存储格式
  const sources = ref<UniversalRule[]>([])
  const currentSource = ref<UniversalRule | null>(null)
  const loading = ref(false)
  const searchQuery = ref('')

  const filteredSources = computed(() => {
    if (!searchQuery.value) return sources.value
    const query = searchQuery.value.toLowerCase()
    return sources.value.filter(
      (s) => s.name.toLowerCase().includes(query) || s.host.toLowerCase().includes(query)
    )
  })

  const sourceCount = computed(() => sources.value.length)

  async function loadSources(): Promise<void> {
    loading.value = true
    try {
      const allKeys = await keys()
      const ruleKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(STORAGE_PREFIX))
      const loadedSources: UniversalRule[] = []
      for (const key of ruleKeys) {
        const rule = await get<UniversalRule>(key)
        if (rule) loadedSources.push(rule)
      }
      sources.value = loadedSources.sort((a, b) => (b.sort || 0) - (a.sort || 0))
    } finally {
      loading.value = false
    }
  }

  async function saveSource(rule: UniversalRule): Promise<void> {
    // 更新元数据
    const ruleToSave: UniversalRule = {
      ...rule,
      _meta: {
        ...rule._meta,
        sourceFormat: rule._meta?.sourceFormat || 'universal',
        updatedAt: Date.now()
      }
    }
    await set(`${STORAGE_PREFIX}${rule.id}`, ruleToSave)
    const index = sources.value.findIndex((s) => s.id === rule.id)
    if (index >= 0) {
      sources.value[index] = ruleToSave
    } else {
      sources.value.unshift(ruleToSave)
    }
  }

  async function deleteSource(id: string): Promise<void> {
    await del(`${STORAGE_PREFIX}${id}`)
    sources.value = sources.value.filter((s) => s.id !== id)
  }

  async function getSource(id: string): Promise<UniversalRule | null> {
    return sources.value.find((s) => s.id === id) || null
  }

  /**
   * 智能导入规则（自动检测格式）
   * 支持 any-reader 和 Legado 格式，统一转换为 UniversalRule 存储
   */
  async function importSources(jsonStr: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      format: 'unknown'
    }

    try {
      const data = JSON.parse(jsonStr)
      const rules: unknown[] = Array.isArray(data) ? data : [data]

      if (rules.length === 0) {
        result.errors.push('没有找到有效规则')
        return result
      }

      // 检测第一个规则的格式来确定整体格式
      const firstFormat = detectRuleFormat(rules[0])
      result.format = firstFormat

      for (let i = 0; i < rules.length; i++) {
        try {
          const rawRule = rules[i]
          const format = detectRuleFormat(rawRule)

          let universalRule: UniversalRule

          if (format === 'any-reader') {
            // 从 any-reader 转换
            universalRule = anyReaderConverter.toUniversal(rawRule as Rule)
          } else if (format === 'legado') {
            // 从 Legado 转换
            universalRule = legadoConverter.toUniversal(rawRule as LegadoRule)
          } else if (format === 'universal') {
            // 已经是通用格式
            universalRule = rawRule as UniversalRule
          } else {
            throw new Error('无法识别的规则格式')
          }

          // 验证必要字段
          if (!universalRule.id || !universalRule.name) {
            throw new Error('规则缺少必要字段 (id 或 name)')
          }

          await saveSource(universalRule)
          result.success++
        } catch (e) {
          result.failed++
          const msg = e instanceof Error ? e.message : '未知错误'
          result.errors.push(`规则 ${i + 1}: ${msg}`)
        }
      }
    } catch (e) {
      result.errors.push(`JSON 解析失败: ${e instanceof Error ? e.message : '未知错误'}`)
    }

    return result
  }

  /**
   * 导出规则为指定格式
   */
  function exportSources(format: ExportFormat = 'any-reader'): string {
    if (format === 'any-reader') {
      const anyReaderRules: Rule[] = sources.value.map((rule) => {
        return anyReaderConverter.fromUniversal(rule)
      })
      return JSON.stringify(anyReaderRules, null, 2)
    } else if (format === 'legado') {
      const legadoRules: LegadoRule[] = sources.value.map((rule) => {
        return legadoConverter.fromUniversal(rule)
      })
      return JSON.stringify(legadoRules, null, 2)
    }

    return JSON.stringify(sources.value, null, 2)
  }

  /**
   * 导出单个规则为指定格式
   */
  function exportSingleSource(rule: UniversalRule, format: ExportFormat = 'any-reader'): string {
    if (format === 'any-reader') {
      const anyReaderRule = anyReaderConverter.fromUniversal(rule)
      return JSON.stringify(anyReaderRule, null, 2)
    } else if (format === 'legado') {
      const legadoRule = legadoConverter.fromUniversal(rule)
      return JSON.stringify(legadoRule, null, 2)
    }

    return JSON.stringify(rule, null, 2)
  }

  /**
   * 清除所有书源数据
   */
  async function clearAllSources(): Promise<number> {
    const allKeys = await keys()
    const ruleKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(STORAGE_PREFIX))
    const count = ruleKeys.length
    for (const key of ruleKeys) {
      await del(key)
    }
    sources.value = []
    return count
  }

  return {
    sources,
    currentSource,
    loading,
    searchQuery,
    filteredSources,
    sourceCount,
    loadSources,
    saveSource,
    deleteSource,
    getSource,
    createNewSource: createDefaultUniversalRule,
    importSources,
    exportSources,
    exportSingleSource,
    clearAllSources
  }
})
