/**
 * 书源规则类型定义
 * 为 Scripting Reader 插件设计
 */

/**
 * 内容类型枚举
 */
export enum UniversalContentType {
  NOVEL = 'novel',
  MANGA = 'manga'
}

/**
 * 搜索规则
 */
export interface UniversalSearchRule {
  enabled: boolean
  url: string
  list: string
  name: string
  cover?: string
  author?: string
  description?: string
  latestChapter?: string
  wordCount?: string
  tags?: string
  result: string
}

/**
 * 章节规则
 */
export interface UniversalChapterRule {
  url?: string
  list: string
  name: string
  cover?: string
  time?: string
  result: string
  nextUrl?: string
  isVip?: string
  isPay?: string
}

/**
 * 发现页规则
 */
export interface UniversalDiscoverRule {
  enabled: boolean
  url: string
  list: string
  name: string
  cover?: string
  author?: string
  description?: string
  tags?: string
  latestChapter?: string
  wordCount?: string
  result: string
  nextUrl?: string
}

/**
 * 正文规则
 */
export interface UniversalContentRule {
  url?: string
  items: string
  nextUrl?: string
}

/**
 * 规则元数据
 */
export interface UniversalRuleMeta {
  sourceFormat: 'universal'
  version?: string
  createdAt?: number
  updatedAt?: number
}

/**
 * 书源规则
 */
export interface UniversalRule {
  id: string
  name: string
  host: string
  icon?: string
  author?: string
  group?: string
  sort?: number
  enabled?: boolean
  comment?: string
  contentType: UniversalContentType
  userAgent?: string
  search?: UniversalSearchRule
  chapter?: UniversalChapterRule
  discover?: UniversalDiscoverRule
  content?: UniversalContentRule
  _meta?: UniversalRuleMeta
}

/**
 * 创建默认规则
 */
export function createDefaultUniversalRule(): UniversalRule {
  return {
    id: crypto.randomUUID(),
    name: '新规则',
    host: '',
    enabled: true,
    contentType: UniversalContentType.NOVEL,
    search: {
      enabled: true,
      url: '',
      list: '',
      name: '',
      result: ''
    },
    _meta: {
      sourceFormat: 'universal',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }
}

/**
 * 内容类型标签
 */
export const UniversalContentTypeLabels: Record<UniversalContentType, string> = {
  [UniversalContentType.NOVEL]: '小说',
  [UniversalContentType.MANGA]: '漫画'
}
