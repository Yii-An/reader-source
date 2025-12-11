/**
 * 通用规则类型定义
 * 兼容 any-reader 和 Legado 的超集设计
 */

/**
 * 统一内容类型枚举
 */
export enum UniversalContentType {
  NOVEL = 'novel', // 小说/文字
  MANGA = 'manga', // 漫画/图片
  VIDEO = 'video', // 视频
  AUDIO = 'audio', // 音频/有声
  RSS = 'rss', // RSS 订阅
  NOVELMORE = 'novelmore' // 小说（更多功能）
}

/**
 * 规则来源平台标识
 */
export type RuleSourcePlatform = 'any-reader' | 'legado' | 'both'

/**
 * 搜索规则
 */
export interface UniversalSearchRule {
  enabled: boolean // 是否启用
  url: string // 搜索 URL 模板
  list: string // 列表选择器
  name: string // 名称选择器
  cover?: string // 封面选择器
  author?: string // 作者选择器
  description?: string // 描述选择器
  latestChapter?: string // 最新章节
  wordCount?: string // 字数
  tags?: string // 标签/分类
  result: string // 结果 URL (跳转下一流程)
}

/**
 * 详情页规则
 */
export interface UniversalDetailRule {
  enabled?: boolean // 是否启用详情页
  url?: string // 详情页 URL
  init?: string // 预处理规则
  name?: string // 书名
  author?: string // 作者
  cover?: string // 封面
  description?: string // 简介
  latestChapter?: string // 最新章节
  wordCount?: string // 字数
  tags?: string // 分类
  tocUrl?: string // 目录 URL
  canRename?: boolean // 允许修改书名作者
}

/**
 * 多线路支持配置
 */
export interface MultiRoadsConfig {
  enabled: boolean
  roads?: string // 线路列表选择器
  roadName?: string // 线路名选择器
}

/**
 * 章节/目录规则
 */
export interface UniversalChapterRule {
  url?: string // 章节列表 URL
  list: string // 列表选择器
  name: string // 章节名选择器
  cover?: string // 封面选择器
  time?: string // 时间选择器
  result: string // 结果 URL (正文地址)
  nextUrl?: string // 下一页 URL
  isVip?: string // VIP 标识
  isPay?: string // 付费标识
  info?: string // 章节信息
  multiRoads?: MultiRoadsConfig // 多线路支持
}

/**
 * 发现页规则
 */
export interface UniversalDiscoverRule {
  enabled: boolean // 是否启用
  url: string // 发现页 URL
  list: string // 列表选择器
  name: string // 名称选择器
  cover?: string // 封面选择器
  author?: string // 作者选择器
  description?: string // 描述选择器
  tags?: string // 标签选择器
  latestChapter?: string // 最新章节
  result: string // 结果 URL
  nextUrl?: string // 下一页 URL
}

/**
 * 正文规则
 */
export interface UniversalContentRule {
  url?: string // 正文页 URL
  items: string // 内容选择器
  nextUrl?: string // 下一页 URL
  decoder?: string // 解密器
  imageHeaders?: string // 图片请求头
  webView?: boolean // 使用 WebView 加载
  payAction?: string // 购买操作
  sourceRegex?: string // 资源正则
}

/**
 * 登录规则
 */
export interface UniversalLoginRule {
  url?: string // 登录 URL
  checkUrl?: string // 登录检测 URL
}

/**
 * 规则元数据
 */
export interface UniversalRuleMeta {
  sourceFormat: 'any-reader' | 'legado' | 'universal'
  version?: string
  createdAt?: number
  updatedAt?: number
  originalData?: unknown // 原始数据（用于无损转换）
}

/**
 * 通用规则类型 (Universal Rule)
 * 兼容 any-reader 和 Legado 的超集设计
 */
export interface UniversalRule {
  // ===== 基本信息 =====
  id: string // 唯一标识
  name: string // 规则名称
  host: string // 域名
  icon?: string // 图标 URL
  author?: string // 作者
  group?: string // 分组
  sort?: number // 排序权重

  // ===== 内容类型 =====
  contentType: UniversalContentType // 统一内容类型

  // ===== 特殊字段来源标记 =====
  _fieldSources?: Record<string, RuleSourcePlatform>

  // ===== 请求设置 =====
  userAgent?: string // User-Agent
  headers?: Record<string, string> // 请求头
  loadJs?: string // 全局 JS 脚本

  // ===== 规则配置 =====
  search?: UniversalSearchRule // 搜索规则
  detail?: UniversalDetailRule // 详情页规则
  chapter?: UniversalChapterRule // 章节/目录规则
  discover?: UniversalDiscoverRule // 发现页规则
  content?: UniversalContentRule // 正文规则
  login?: UniversalLoginRule // 登录规则

  // ===== 元数据 =====
  _meta?: UniversalRuleMeta
}

/**
 * 创建默认通用规则
 */
export function createDefaultUniversalRule(): UniversalRule {
  return {
    id: crypto.randomUUID(),
    name: '新规则',
    host: '',
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
 * 内容类型标签映射
 */
export const UniversalContentTypeLabels: Record<UniversalContentType, string> = {
  [UniversalContentType.NOVEL]: '小说',
  [UniversalContentType.MANGA]: '漫画',
  [UniversalContentType.VIDEO]: '视频',
  [UniversalContentType.AUDIO]: '音频',
  [UniversalContentType.RSS]: 'RSS',
  [UniversalContentType.NOVELMORE]: '小说(增强)'
}
