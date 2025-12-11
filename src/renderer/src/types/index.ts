/**
 * Any-Reader 规则类型定义
 */

/**
 * 内容类型常量
 */
export const ContentType = {
  MANGA: 0, // 漫画
  NOVEL: 1, // 小说
  VIDEO: 2, // 视频
  AUDIO: 3 // 音频
} as const

export type ContentType = (typeof ContentType)[keyof typeof ContentType]

/**
 * 规则接口
 */
export type Rule = {
  id: string
  name: string
  host: string
  icon?: string
  contentType: ContentType
  sort?: number
  author?: string
  userAgent?: string
  loadJs?: string

  enableSearch?: boolean
  searchUrl?: string
  searchList?: string
  searchName?: string
  searchCover?: string
  searchAuthor?: string
  searchChapter?: string
  searchDescription?: string
  searchResult?: string

  chapterUrl?: string
  chapterList?: string
  chapterName?: string
  chapterCover?: string
  chapterTime?: string
  chapterResult?: string
  chapterNextUrl?: string

  enableDiscover?: boolean
  discoverUrl?: string
  discoverList?: string
  discoverName?: string
  discoverCover?: string
  discoverAuthor?: string
  discoverDescription?: string
  discoverResult?: string
  discoverTags?: string
  discoverChapter?: string
  discoverNextUrl?: string

  contentUrl?: string
  contentItems?: string
  contentNextUrl?: string
  contentDecoder?: string
}

export type SearchItem = {
  name: string
  cover?: string
  author?: string
  chapter?: string
  description?: string
  url: string
}

export type ChapterItem = {
  name: string
  cover?: string
  time?: string
  url: string
}

export type LogLevel = 'info' | 'debug' | 'warn' | 'error'

export type LogItem = {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  data?: unknown
}

export function createDefaultRule(): Rule {
  return {
    id: crypto.randomUUID(),
    name: '新书源',
    host: '',
    contentType: ContentType.NOVEL,
    enableSearch: true,
    enableDiscover: false
  }
}

export const ContentTypeLabels: Record<ContentType, string> = {
  [ContentType.VIDEO]: '视频',
  [ContentType.NOVEL]: '小说',
  [ContentType.AUDIO]: '音频',
  [ContentType.MANGA]: '漫画'
}
