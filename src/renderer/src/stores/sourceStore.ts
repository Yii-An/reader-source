import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, set, del, keys } from 'idb-keyval'
import type { Rule } from '../types'
import { createDefaultRule } from '../types'

const STORAGE_PREFIX = 'rule_'

export const useSourceStore = defineStore('source', () => {
  const sources = ref<Rule[]>([])
  const currentSource = ref<Rule | null>(null)
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

  async function loadSources() {
    loading.value = true
    try {
      const allKeys = await keys()
      const ruleKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(STORAGE_PREFIX))
      const loadedSources: Rule[] = []
      for (const key of ruleKeys) {
        const rule = await get<Rule>(key)
        if (rule) loadedSources.push(rule)
      }
      sources.value = loadedSources.sort((a, b) => (b.sort || 0) - (a.sort || 0))
    } finally {
      loading.value = false
    }
  }

  async function saveSource(rule: Rule) {
    await set(`${STORAGE_PREFIX}${rule.id}`, rule)
    const index = sources.value.findIndex((s) => s.id === rule.id)
    if (index >= 0) {
      sources.value[index] = rule
    } else {
      sources.value.unshift(rule)
    }
  }

  async function deleteSource(id: string) {
    await del(`${STORAGE_PREFIX}${id}`)
    sources.value = sources.value.filter((s) => s.id !== id)
  }

  async function getSource(id: string): Promise<Rule | null> {
    return sources.value.find((s) => s.id === id) || null
  }

  async function importSources(jsonStr: string): Promise<number> {
    const data = JSON.parse(jsonStr)
    const rules: Rule[] = Array.isArray(data) ? data : [data]
    let count = 0
    for (const rule of rules) {
      if (rule.id && rule.name) {
        await saveSource(rule)
        count++
      }
    }
    return count
  }

  function exportSources(): string {
    return JSON.stringify(sources.value, null, 2)
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
    createNewSource: createDefaultRule,
    importSources,
    exportSources
  }
})
