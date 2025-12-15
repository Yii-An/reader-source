/**
 * 书源状态管理 Store
 *
 * 职责:
 * - 管理书源规则的 CRUD 操作
 * - 提供规则的导入/导出功能
 * - 使用 IndexedDB 持久化存储
 *
 * 存储策略:
 * - 所有规则统一存储为 UniversalRule 格式
 * - 内存缓存 + IndexedDB 双层存储
 * - 键格式: rule_{id}
 */
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

/** IndexedDB 存储键前缀 */
const STORAGE_PREFIX = 'rule_'

/**
 * 导入结果接口
 */
export interface ImportResult {
  /** 成功导入的规则数量 */
  success: number
  /** 导入失败的规则数量 */
  failed: number
  /** 错误信息列表 */
  errors: string[]
  /** 检测到的规则格式 */
  format: RuleFormat
}

/**
 * 导出格式类型
 */
export type ExportFormat = 'any-reader' | 'legado'

export const useSourceStore = defineStore('source', () => {
  // ============================================================
  // 响应式状态
  // ============================================================

  /** 所有书源规则（内存缓存） */
  const sources = ref<UniversalRule[]>([])

  /** 当前选中的规则 */
  const currentSource = ref<UniversalRule | null>(null)

  /** 加载状态标志 */
  const loading = ref(false)

  /** 搜索关键词 */
  const searchQuery = ref('')

  // ============================================================
  // 计算属性
  // ============================================================

  /**
   * 根据搜索词过滤后的规则列表
   * 匹配规则名称或域名
   */
  const filteredSources = computed(() => {
    if (!searchQuery.value) return sources.value
    const query = searchQuery.value.toLowerCase()
    return sources.value.filter(
      (s) => s.name.toLowerCase().includes(query) || s.host.toLowerCase().includes(query)
    )
  })

  /** 规则总数 */
  const sourceCount = computed(() => sources.value.length)

  // ============================================================
  // 核心方法
  // ============================================================

  /**
   * 从 IndexedDB 加载所有规则到内存
   * 应在应用启动时调用
   */
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
      // 按权重排序（权重大的在前）
      sources.value = loadedSources.sort((a, b) => (b.sort || 0) - (a.sort || 0))
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存规则到存储
   * 同时更新 IndexedDB 和内存缓存
   * @param rule 要保存的规则
   */
  async function saveSource(rule: UniversalRule): Promise<void> {
    // 更新元数据（来源格式、更新时间）
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

  /**
   * 删除规则
   * 同时从 IndexedDB 和内存缓存中移除
   * @param id 规则 ID
   */
  async function deleteSource(id: string): Promise<void> {
    await del(`${STORAGE_PREFIX}${id}`)
    sources.value = sources.value.filter((s) => s.id !== id)
  }

  /**
   * 根据 ID 获取规则
   * 优先从内存缓存查找，未找到则查询 IndexedDB
   * @param id 规则 ID
   * @returns 规则对象，不存在则返回 null
   */
  async function getSource(id: string): Promise<UniversalRule | null> {
    // 优先从内存缓存查找（快速）
    const cached = sources.value.find((s) => s.id === id)
    if (cached) return cached
    // 内存未找到，回退到 IndexedDB 查询
    return (await get<UniversalRule>(`${STORAGE_PREFIX}${id}`)) || null
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
   * 批量导出所有规则为指定格式
   * @param format 目标格式 ('any-reader' | 'legado')
   * @returns 格式化的 JSON 字符串
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
   * @param rule 要导出的规则
   * @param format 目标格式 ('any-reader' | 'legado')
   * @returns 格式化的 JSON 字符串
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
   * 从 IndexedDB 删除所有规则并清空内存缓存
   * @returns 删除的规则数量
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

  // ============================================================
  // 导出 Store API
  // ============================================================

  return {
    // 状态
    sources, // 所有规则列表
    currentSource, // 当前选中规则
    loading, // 加载状态
    searchQuery, // 搜索关键词

    // 计算属性
    filteredSources, // 过滤后的规则列表
    sourceCount, // 规则总数

    // CRUD 方法
    loadSources, // 加载所有规则
    saveSource, // 保存规则
    deleteSource, // 删除规则
    getSource, // 获取规则
    createNewSource: createDefaultUniversalRule, // 创建新规则

    // 导入导出
    importSources, // 智能导入
    exportSources, // 批量导出
    exportSingleSource, // 单个导出
    clearAllSources // 清除所有
  }
})
