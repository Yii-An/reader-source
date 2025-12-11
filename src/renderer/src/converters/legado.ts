/**
 * Legado 规则转换器
 * 实现 Legado 书源规则与通用规则的双向转换
 */

import type { LegadoRule } from '../types/legado'
import type {
  UniversalRule,
  UniversalSearchRule,
  UniversalDetailRule,
  UniversalChapterRule,
  UniversalDiscoverRule,
  UniversalContentRule,
  UniversalLoginRule
} from '../types/universal'
import { UniversalContentType } from '../types/universal'
import type { RuleConverter, ValidationResult, ConvertOptions } from './base'
import { createValidationResult, addValidationError, addValidationWarning } from './base'
import { normalizeExpression } from '../types/expression'

/**
 * 从 URL 提取域名
 */
function extractHost(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    // 如果不是有效 URL，尝试提取域名部分
    const match = url.match(/^(https?:\/\/[^\/]+)/)
    return match ? match[1] : url
  }
}

/**
 * Legado 内容类型到通用类型的映射
 */
const LEGADO_TYPE_TO_UNIVERSAL: Record<number, UniversalContentType> = {
  0: UniversalContentType.NOVEL,
  1: UniversalContentType.AUDIO
}

/**
 * 通用类型到 Legado 内容类型的映射
 */
const UNIVERSAL_TO_LEGADO_TYPE: Record<UniversalContentType, number> = {
  [UniversalContentType.NOVEL]: 0,
  [UniversalContentType.MANGA]: 0, // Legado 不支持漫画，降级为文字
  [UniversalContentType.VIDEO]: 0, // Legado 不支持视频，降级为文字
  [UniversalContentType.AUDIO]: 1,
  [UniversalContentType.RSS]: 0,
  [UniversalContentType.NOVELMORE]: 0
}

/**
 * Legado 规则转换器
 */
export class LegadoConverter implements RuleConverter<LegadoRule> {
  /**
   * 将 Legado 规则转换为通用规则
   */
  toUniversal(rule: LegadoRule, options?: ConvertOptions): UniversalRule {
    const host = extractHost(rule.bookSourceUrl)

    const universal: UniversalRule = {
      id: rule.bookSourceUrl,
      name: rule.bookSourceName,
      host: host,
      group: rule.bookSourceGroup,
      sort: rule.customOrder,
      contentType: LEGADO_TYPE_TO_UNIVERSAL[rule.bookSourceType ?? 0] || UniversalContentType.NOVEL,
      headers: this.parseHeaders(rule.header),
      _fieldSources: {},
      _meta: {
        sourceFormat: 'legado',
        updatedAt: rule.lastUpdateTime || Date.now(),
        ...(options?.preserveOriginal ? { originalData: rule } : {})
      }
    }

    // 转换搜索规则
    if (rule.searchUrl || rule.ruleSearch) {
      universal.search = this.convertSearchRuleToUniversal(rule)
    }

    // 转换详情页规则
    if (rule.ruleBookInfo) {
      universal.detail = this.convertDetailRuleToUniversal(rule)
    }

    // 转换目录规则
    if (rule.ruleToc) {
      universal.chapter = this.convertChapterRuleToUniversal(rule)
    }

    // 转换发现页规则
    if (rule.exploreUrl || rule.ruleExplore) {
      universal.discover = this.convertDiscoverRuleToUniversal(rule)
    }

    // 转换正文规则
    if (rule.ruleContent) {
      universal.content = this.convertContentRuleToUniversal(rule)
    }

    // 转换登录规则
    if (rule.loginUrl) {
      universal.login = this.convertLoginRuleToUniversal(rule)
    }

    return universal
  }

  /**
   * 将通用规则转换为 Legado 规则
   */
  fromUniversal(rule: UniversalRule, _options?: ConvertOptions): LegadoRule {
    const legadoRule: LegadoRule = {
      bookSourceUrl: rule.id,
      bookSourceName: rule.name,
      bookSourceGroup: rule.group,
      bookSourceType: UNIVERSAL_TO_LEGADO_TYPE[rule.contentType],
      customOrder: rule.sort,
      enabled: true,
      enabledExplore: rule.discover?.enabled ?? false,
      lastUpdateTime: rule._meta?.updatedAt || Date.now(),
      header: rule.headers ? JSON.stringify(rule.headers) : undefined
    }

    // 转换搜索规则
    if (rule.search) {
      Object.assign(legadoRule, this.convertSearchRuleFromUniversal(rule.search))
    }

    // 转换详情页规则
    if (rule.detail) {
      legadoRule.ruleBookInfo = this.convertDetailRuleFromUniversal(rule.detail)
    }

    // 转换目录规则
    if (rule.chapter) {
      legadoRule.ruleToc = this.convertChapterRuleFromUniversal(rule.chapter)
    }

    // 转换发现页规则
    if (rule.discover) {
      Object.assign(legadoRule, this.convertDiscoverRuleFromUniversal(rule.discover))
    }

    // 转换正文规则
    if (rule.content) {
      legadoRule.ruleContent = this.convertContentRuleFromUniversal(rule.content)
    }

    // 转换登录规则
    if (rule.login) {
      Object.assign(legadoRule, this.convertLoginRuleFromUniversal(rule.login))
    }

    return legadoRule
  }

  /**
   * 验证 Legado 规则
   */
  validate(rule: LegadoRule): ValidationResult {
    const result = createValidationResult()

    // 必填字段检查
    if (!rule.bookSourceUrl) {
      addValidationError(result, 'bookSourceUrl', '书源 URL 不能为空', 'REQUIRED_FIELD')
    }
    if (!rule.bookSourceName) {
      addValidationError(result, 'bookSourceName', '书源名称不能为空', 'REQUIRED_FIELD')
    }

    // 搜索规则检查
    if (rule.searchUrl && !rule.ruleSearch) {
      addValidationWarning(result, 'ruleSearch', '有搜索地址但没有搜索规则', 'MISSING_RULE')
    }

    // 目录规则检查
    if (!rule.ruleToc?.chapterList) {
      addValidationWarning(
        result,
        'ruleToc.chapterList',
        '建议填写目录列表规则',
        'RECOMMENDED_FIELD'
      )
    }

    // 正文规则检查
    if (!rule.ruleContent?.content) {
      addValidationWarning(result, 'ruleContent.content', '建议填写正文规则', 'RECOMMENDED_FIELD')
    }

    return result
  }

  /**
   * 检测是否为 Legado 规则
   */
  detect(rule: unknown): rule is LegadoRule {
    if (!rule || typeof rule !== 'object') {
      return false
    }

    const r = rule as Record<string, unknown>

    // Legado 特征：有 bookSourceUrl 和 bookSourceName
    return typeof r.bookSourceUrl === 'string' && typeof r.bookSourceName === 'string'
  }

  // ===== 私有方法 =====

  /**
   * 解析请求头
   */
  private parseHeaders(header?: string): Record<string, string> | undefined {
    if (!header) return undefined

    try {
      // 如果是 JSON 字符串
      if (header.startsWith('{')) {
        return JSON.parse(header)
      }
      return undefined
    } catch {
      return undefined
    }
  }

  /**
   * 标准化 Legado 表达式
   */
  private normalizeExpr(expr?: string): string | undefined {
    if (!expr) return undefined
    return normalizeExpression(expr)
  }

  private convertSearchRuleToUniversal(rule: LegadoRule): UniversalSearchRule {
    const rs = rule.ruleSearch || {}
    return {
      enabled: !!rule.searchUrl,
      url: rule.searchUrl || '',
      list: this.normalizeExpr(rs.bookList) || '',
      name: this.normalizeExpr(rs.name) || '',
      cover: this.normalizeExpr(rs.coverUrl),
      author: this.normalizeExpr(rs.author),
      description: this.normalizeExpr(rs.intro),
      latestChapter: this.normalizeExpr(rs.lastChapter),
      wordCount: this.normalizeExpr(rs.wordCount),
      tags: this.normalizeExpr(rs.kind),
      result: this.normalizeExpr(rs.bookUrl) || ''
    }
  }

  private convertSearchRuleFromUniversal(search: UniversalSearchRule): Partial<LegadoRule> {
    return {
      searchUrl: search.url,
      ruleSearch: {
        bookList: search.list,
        name: search.name,
        coverUrl: search.cover,
        author: search.author,
        intro: search.description,
        lastChapter: search.latestChapter,
        wordCount: search.wordCount,
        kind: search.tags,
        bookUrl: search.result
      }
    }
  }

  private convertDetailRuleToUniversal(rule: LegadoRule): UniversalDetailRule {
    const rb = rule.ruleBookInfo || {}
    return {
      enabled: true,
      init: this.normalizeExpr(rb.init),
      name: this.normalizeExpr(rb.name),
      author: this.normalizeExpr(rb.author),
      cover: this.normalizeExpr(rb.coverUrl),
      description: this.normalizeExpr(rb.intro),
      latestChapter: this.normalizeExpr(rb.lastChapter),
      wordCount: this.normalizeExpr(rb.wordCount),
      tags: this.normalizeExpr(rb.kind),
      tocUrl: this.normalizeExpr(rb.tocUrl),
      canRename: rb.canReName
    }
  }

  private convertDetailRuleFromUniversal(detail: UniversalDetailRule): LegadoRule['ruleBookInfo'] {
    return {
      init: detail.init,
      name: detail.name,
      author: detail.author,
      coverUrl: detail.cover,
      intro: detail.description,
      lastChapter: detail.latestChapter,
      wordCount: detail.wordCount,
      kind: detail.tags,
      tocUrl: detail.tocUrl,
      canReName: detail.canRename
    }
  }

  private convertChapterRuleToUniversal(rule: LegadoRule): UniversalChapterRule {
    const rt = rule.ruleToc || {}
    return {
      list: this.normalizeExpr(rt.chapterList) || '',
      name: this.normalizeExpr(rt.chapterName) || '',
      result: this.normalizeExpr(rt.chapterUrl) || '',
      time: this.normalizeExpr(rt.updateTime),
      nextUrl: this.normalizeExpr(rt.nextTocUrl),
      isVip: this.normalizeExpr(rt.isVip),
      isPay: this.normalizeExpr(rt.isPay)
    }
  }

  private convertChapterRuleFromUniversal(chapter: UniversalChapterRule): LegadoRule['ruleToc'] {
    return {
      chapterList: chapter.list,
      chapterName: chapter.name,
      chapterUrl: chapter.result,
      updateTime: chapter.time,
      nextTocUrl: chapter.nextUrl,
      isVip: chapter.isVip,
      isPay: chapter.isPay
    }
  }

  private convertDiscoverRuleToUniversal(rule: LegadoRule): UniversalDiscoverRule {
    const re = rule.ruleExplore || {}
    return {
      enabled: rule.enabledExplore ?? !!rule.exploreUrl,
      url: rule.exploreUrl || '',
      list: this.normalizeExpr(re.bookList) || '',
      name: this.normalizeExpr(re.name) || '',
      cover: this.normalizeExpr(re.coverUrl),
      author: this.normalizeExpr(re.author),
      description: this.normalizeExpr(re.intro),
      tags: this.normalizeExpr(re.kind),
      latestChapter: this.normalizeExpr(re.lastChapter),
      result: this.normalizeExpr(re.bookUrl) || ''
    }
  }

  private convertDiscoverRuleFromUniversal(discover: UniversalDiscoverRule): Partial<LegadoRule> {
    return {
      exploreUrl: discover.url,
      enabledExplore: discover.enabled,
      ruleExplore: {
        bookList: discover.list,
        name: discover.name,
        coverUrl: discover.cover,
        author: discover.author,
        intro: discover.description,
        kind: discover.tags,
        lastChapter: discover.latestChapter,
        bookUrl: discover.result
      }
    }
  }

  private convertContentRuleToUniversal(rule: LegadoRule): UniversalContentRule {
    const rc = rule.ruleContent || {}
    return {
      items: this.normalizeExpr(rc.content) || '',
      nextUrl: this.normalizeExpr(rc.nextContentUrl),
      sourceRegex: rc.sourceRegex,
      payAction: rc.payAction
    }
  }

  private convertContentRuleFromUniversal(
    content: UniversalContentRule
  ): LegadoRule['ruleContent'] {
    return {
      content: content.items,
      nextContentUrl: content.nextUrl,
      sourceRegex: content.sourceRegex,
      payAction: content.payAction
    }
  }

  private convertLoginRuleToUniversal(rule: LegadoRule): UniversalLoginRule {
    return {
      url: rule.loginUrl,
      checkUrl: rule.loginCheckJs
    }
  }

  private convertLoginRuleFromUniversal(login: UniversalLoginRule): Partial<LegadoRule> {
    return {
      loginUrl: login.url,
      loginCheckJs: login.checkUrl
    }
  }
}

/**
 * 默认 Legado 转换器实例
 */
export const legadoConverter = new LegadoConverter()
