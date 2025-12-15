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
 * 完整的 any-reader 规则字段定义
 */
export type Rule = {
  // ===== 基本信息 =====
  id: string // UUID，规则唯一标识
  name: string // 规则名称
  host: string // 域名
  icon?: string // 图标 URL
  contentType: ContentType // 规则类型
  sort?: number // 排序权重，越高越靠前
  author?: string // 规则作者
  userAgent?: string // Headers JSON 字符串
  loadJs?: string // 全局 JS 脚本
  group?: string // 分组

  // ===== any-reader 特有基本字段 =====
  useCryptoJS?: boolean // 是否使用 CryptoJS
  postScript?: string // 脚本后处理
  cookies?: string // Cookie 存储
  viewStyle?: number // 视图样式

  // ===== 搜索规则 =====
  enableSearch?: boolean // 是否启用搜索
  searchUrl?: string // 搜索地址
  searchList?: string // 搜索列表选择器
  searchName?: string // 名称选择器
  searchCover?: string // 封面选择器
  searchAuthor?: string // 作者选择器
  searchChapter?: string // 最新章节选择器
  searchDescription?: string // 描述选择器
  searchResult?: string // 结果 URL 选择器
  searchTags?: string // 标签选择器
  searchItems?: string // 搜索项模板

  // ===== 章节规则 =====
  chapterUrl?: string // 章节列表 URL
  chapterList?: string // 章节列表选择器
  chapterName?: string // 章节名选择器
  chapterCover?: string // 封面选择器
  chapterTime?: string // 时间选择器
  chapterResult?: string // 结果 URL 选择器
  chapterNextUrl?: string // 下一页 URL 选择器
  chapterItems?: string // 章节项模板
  chapterLock?: string // 章节锁定标识选择器

  // ===== 多线路支持 =====
  enableMultiRoads?: boolean // 是否启用多线路
  chapterRoads?: string // 线路列表选择器
  chapterRoadName?: string // 线路名选择器

  // ===== 发现页规则 =====
  enableDiscover?: boolean // 是否启用发现页
  discoverUrl?: string // 发现页地址
  discoverList?: string // 发现列表选择器
  discoverName?: string // 名称选择器
  discoverCover?: string // 封面选择器
  discoverAuthor?: string // 作者选择器
  discoverDescription?: string // 描述选择器
  discoverResult?: string // 结果 URL 选择器
  discoverTags?: string // 标签选择器
  discoverChapter?: string // 最新章节选择器
  discoverNextUrl?: string // 下一页 URL 选择器
  discoverItems?: string // 发现项模板

  // ===== 正文规则 =====
  contentUrl?: string // 正文页 URL
  contentItems?: string // 内容选择器
  contentNextUrl?: string // 下一页 URL
  contentDecoder?: string // 解密器

  // ===== 登录规则 =====
  loginUrl?: string // 登录 URL
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
