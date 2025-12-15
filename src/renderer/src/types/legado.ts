/**
 * Legado 规则类型定义
 * 用于 Legado 书源格式的解析和转换
 */

/**
 * Legado 搜索规则
 */
export interface LegadoRuleSearch {
  bookList?: string
  name?: string
  author?: string
  kind?: string
  wordCount?: string
  lastChapter?: string
  intro?: string
  coverUrl?: string
  bookUrl?: string
}

/**
 * Legado 书籍详情规则
 */
export interface LegadoRuleBookInfo {
  init?: string
  name?: string
  author?: string
  kind?: string
  wordCount?: string
  lastChapter?: string
  intro?: string
  coverUrl?: string
  tocUrl?: string
  canReName?: boolean
}

/**
 * Legado 目录规则
 */
export interface LegadoRuleToc {
  chapterList?: string
  chapterName?: string
  chapterUrl?: string
  isVip?: string
  isPay?: string
  updateTime?: string
  nextTocUrl?: string
}

/**
 * Legado 正文规则
 */
export interface LegadoRuleContent {
  content?: string
  nextContentUrl?: string
  webJs?: string
  sourceRegex?: string
  replaceRegex?: string
  imageStyle?: string
  payAction?: string
}

/**
 * Legado 发现规则
 */
export interface LegadoRuleExplore {
  bookList?: string
  name?: string
  author?: string
  kind?: string
  wordCount?: string
  lastChapter?: string
  intro?: string
  coverUrl?: string
  bookUrl?: string
}

/**
 * Legado 书源规则
 * 完整的 Legado 书源字段定义
 */
export interface LegadoRule {
  // ===== 基本信息 =====
  bookSourceUrl: string // 唯一标识（书源 URL）
  bookSourceName: string // 书源名称
  bookSourceGroup?: string // 分组
  bookSourceType?: number // 类型: 0=文字, 1=音频
  bookSourceComment?: string // 备注/说明

  // ===== 状态与排序 =====
  customOrder?: number // 自定义排序
  enabled?: boolean // 是否启用
  enabledExplore?: boolean // 是否启用发现
  lastUpdateTime?: number // 最后更新时间
  weight?: number // 权重（用于排序）
  respondTime?: number // 响应时间

  // ===== 高级设置 =====
  jsLib?: string // JS 函数库（复杂规则共用函数）
  enabledCookieJar?: boolean // 是否启用 Cookie 罐
  customButton?: boolean // 自定义按钮
  eventListener?: boolean // 事件监听器

  // ===== 请求设置 =====
  header?: string // 请求头 JSON 字符串或对象
  loginUrl?: string // 登录地址
  loginUi?: string // 登录 UI 配置 JSON
  loginCheckJs?: string // 登录检测 JS 脚本
  bookUrlPattern?: string // 书籍 URL 正则（用于添加网址时识别书源）

  // 搜索
  searchUrl?: string
  ruleSearch?: LegadoRuleSearch

  // 发现
  exploreUrl?: string
  ruleExplore?: LegadoRuleExplore

  // 书籍详情
  ruleBookInfo?: LegadoRuleBookInfo

  // 目录
  ruleToc?: LegadoRuleToc

  // 正文
  ruleContent?: LegadoRuleContent
}
