/**
 * 书源状态管理 Store
 * 管理书源规则的 CRUD 操作，使用 IndexedDB 持久化存储
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, set, del, keys } from 'idb-keyval'
import type { UniversalRule } from '../types/universal'
import { createDefaultUniversalRule } from '../types/universal'

/** IndexedDB 存储键前缀 */
const STORAGE_PREFIX = 'rule_'

export const useSourceStore = defineStore('source', () => {
  /** 所有书源规则（内存缓存） */
  const sources = ref<UniversalRule[]>([])

  /** 当前选中的规则 */
  const currentSource = ref<UniversalRule | null>(null)

  /** 加载状态标志 */
  const loading = ref(false)

  /** 搜索关键词 */
  const searchQuery = ref('')

  /**
   * 根据搜索词过滤后的规则列表
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

  /**
   * 从 IndexedDB 加载所有规则到内存
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
      sources.value = loadedSources.sort((a, b) => (b.sort || 0) - (a.sort || 0))
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存规则到存储
   */
  async function saveSource(rule: UniversalRule): Promise<void> {
    const ruleToSave: UniversalRule = {
      ...rule,
      _meta: {
        ...rule._meta,
        sourceFormat: 'universal',
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
   */
  async function deleteSource(id: string): Promise<void> {
    await del(`${STORAGE_PREFIX}${id}`)
    sources.value = sources.value.filter((s) => s.id !== id)
  }

  /**
   * 根据 ID 获取规则
   */
  async function getSource(id: string): Promise<UniversalRule | null> {
    const cached = sources.value.find((s) => s.id === id)
    if (cached) return cached
    return (await get<UniversalRule>(`${STORAGE_PREFIX}${id}`)) || null
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
    clearAllSources
  }
})
