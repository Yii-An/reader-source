/**
 * any-reader 规则转换器
 * 实现 any-reader 规则与通用规则的双向转换
 */

import type { Rule, ContentType } from '../types'
import type {
  UniversalRule,
  UniversalSearchRule,
  UniversalChapterRule,
  UniversalDiscoverRule,
  UniversalContentRule
} from '../types/universal'
import { UniversalContentType } from '../types/universal'
import type { RuleConverter, ValidationResult, ConvertOptions } from './base'
import { createValidationResult, addValidationError, addValidationWarning } from './base'

/**
 * any-reader 内容类型到通用类型的映射
 */
const CONTENT_TYPE_TO_UNIVERSAL: Record<number, UniversalContentType> = {
  0: UniversalContentType.MANGA,
  1: UniversalContentType.NOVEL,
  2: UniversalContentType.VIDEO,
  3: UniversalContentType.AUDIO
}

/**
 * 通用类型到 any-reader 内容类型的映射
 */
const UNIVERSAL_TO_CONTENT_TYPE: Record<UniversalContentType, number> = {
  [UniversalContentType.MANGA]: 0,
  [UniversalContentType.NOVEL]: 1,
  [UniversalContentType.VIDEO]: 2,
  [UniversalContentType.AUDIO]: 3,
  [UniversalContentType.RSS]: 1, // RSS 降级为小说
  [UniversalContentType.NOVELMORE]: 1 // NOVELMORE 降级为小说
}

/**
 * any-reader 规则转换器
 */
export class AnyReaderConverter implements RuleConverter<Rule> {
  /**
   * 将 any-reader 规则转换为通用规则
   */
  toUniversal(rule: Rule, options?: ConvertOptions): UniversalRule {
    const universal: UniversalRule = {
      id: rule.id,
      name: rule.name,
      host: rule.host,
      icon: rule.icon,
      author: rule.author,
      group: rule.group,
      sort: rule.sort,
      enabled: true, // any-reader 规则默认启用
      contentType: CONTENT_TYPE_TO_UNIVERSAL[rule.contentType] || UniversalContentType.NOVEL,
      userAgent: rule.userAgent,
      loadJs: rule.loadJs,
      // any-reader 基本设置特有字段
      anyReader: {
        useCryptoJS: rule.useCryptoJS,
        cookies: rule.cookies,
        postScript: rule.postScript,
        viewStyle: rule.viewStyle
      },
      _meta: {
        sourceFormat: 'any-reader',
        updatedAt: Date.now(),
        ...(options?.preserveOriginal ? { originalData: rule } : {})
      }
    }

    // 转换搜索规则
    if (rule.enableSearch || rule.searchUrl) {
      universal.search = this.convertSearchRuleToUniversal(rule)
    }

    // 转换章节规则
    if (rule.chapterList || rule.chapterUrl) {
      universal.chapter = this.convertChapterRuleToUniversal(rule)
    }

    // 转换发现页规则
    if (rule.enableDiscover || rule.discoverUrl) {
      universal.discover = this.convertDiscoverRuleToUniversal(rule)
    }

    // 转换正文规则
    if (rule.contentItems || rule.contentUrl) {
      universal.content = this.convertContentRuleToUniversal(rule)
    }

    // any-reader 的 loginUrl 不转换为通用规则（登录是平台特有功能）

    return universal
  }

  /**
   * 将通用规则转换为 any-reader 规则
   */
  fromUniversal(rule: UniversalRule, _options?: ConvertOptions): Rule {
    const anyReaderRule: Rule = {
      id: rule.id,
      name: rule.name,
      host: rule.host,
      icon: rule.icon,
      contentType: UNIVERSAL_TO_CONTENT_TYPE[rule.contentType] as ContentType,
      sort: rule.sort,
      author: rule.author,
      group: rule.group,
      userAgent: rule.userAgent,
      loadJs: rule.loadJs,
      // any-reader 特有字段
      useCryptoJS: rule.anyReader?.useCryptoJS,
      cookies: rule.anyReader?.cookies,
      postScript: rule.anyReader?.postScript,
      viewStyle: rule.anyReader?.viewStyle,
      // any-reader 的 loginUrl 保持原样（不从通用规则提取）
      loginUrl: undefined
    }

    // 转换搜索规则
    if (rule.search) {
      Object.assign(anyReaderRule, this.convertSearchRuleFromUniversal(rule.search))
      // any-reader 特有搜索字段 (从 search.anyReader 提取)
      if (rule.search.anyReader?.items) {
        anyReaderRule.searchItems = rule.search.anyReader.items
      }
    }

    // 转换章节规则
    if (rule.chapter) {
      Object.assign(anyReaderRule, this.convertChapterRuleFromUniversal(rule.chapter))
      // any-reader 特有章节字段 (从 chapter.anyReader 提取)
      if (rule.chapter.anyReader?.items) {
        anyReaderRule.chapterItems = rule.chapter.anyReader.items
      }
      if (rule.chapter.anyReader?.lock) {
        anyReaderRule.chapterLock = rule.chapter.anyReader.lock
      }
    }

    // 转换发现页规则
    if (rule.discover) {
      Object.assign(anyReaderRule, this.convertDiscoverRuleFromUniversal(rule.discover))
      // any-reader 特有发现页字段 (从 discover.anyReader 提取)
      if (rule.discover.anyReader?.items) {
        anyReaderRule.discoverItems = rule.discover.anyReader.items
      }
    }

    // 转换正文规则
    if (rule.content) {
      Object.assign(anyReaderRule, this.convertContentRuleFromUniversal(rule.content))
    }

    return anyReaderRule
  }

  /**
   * 验证 any-reader 规则
   */
  validate(rule: Rule): ValidationResult {
    const result = createValidationResult()

    // 必填字段检查
    if (!rule.id) {
      addValidationError(result, 'id', '规则 ID 不能为空', 'REQUIRED_FIELD')
    }
    if (!rule.name) {
      addValidationError(result, 'name', '规则名称不能为空', 'REQUIRED_FIELD')
    }
    if (!rule.host) {
      addValidationWarning(result, 'host', '建议填写域名', 'RECOMMENDED_FIELD')
    }

    // 搜索规则检查
    if (rule.enableSearch) {
      if (!rule.searchUrl) {
        addValidationError(result, 'searchUrl', '启用搜索时搜索地址不能为空', 'REQUIRED_FIELD')
      }
      if (!rule.searchList) {
        addValidationWarning(result, 'searchList', '建议填写搜索列表规则', 'RECOMMENDED_FIELD')
      }
    }

    // 发现页规则检查
    if (rule.enableDiscover) {
      if (!rule.discoverUrl) {
        addValidationError(result, 'discoverUrl', '启用发现页时发现地址不能为空', 'REQUIRED_FIELD')
      }
    }

    return result
  }

  /**
   * 检测是否为 any-reader 规则
   */
  detect(rule: unknown): rule is Rule {
    if (!rule || typeof rule !== 'object') {
      return false
    }

    const r = rule as Record<string, unknown>

    // any-reader 特征：有 contentType 数字字段，且没有 bookSourceUrl
    return (
      typeof r.id === 'string' &&
      typeof r.name === 'string' &&
      typeof r.contentType === 'number' &&
      !('bookSourceUrl' in r) &&
      !('bookSourceName' in r)
    )
  }

  // ===== 私有转换方法 =====

  private convertSearchRuleToUniversal(rule: Rule): UniversalSearchRule {
    return {
      enabled: rule.enableSearch ?? false,
      url: rule.searchUrl ?? '',
      list: rule.searchList ?? '',
      name: rule.searchName ?? '',
      cover: rule.searchCover,
      author: rule.searchAuthor,
      description: rule.searchDescription,
      latestChapter: rule.searchChapter,
      tags: rule.searchTags,
      result: rule.searchResult ?? '',
      // any-reader 特有字段
      anyReader: rule.searchItems ? { items: rule.searchItems } : undefined
    }
  }

  private convertSearchRuleFromUniversal(search: UniversalSearchRule): Partial<Rule> {
    return {
      enableSearch: search.enabled,
      searchUrl: search.url,
      searchList: search.list,
      searchName: search.name,
      searchCover: search.cover,
      searchAuthor: search.author,
      searchDescription: search.description,
      searchChapter: search.latestChapter,
      searchTags: search.tags,
      searchResult: search.result
    }
  }

  private convertChapterRuleToUniversal(rule: Rule): UniversalChapterRule {
    return {
      url: rule.chapterUrl,
      list: rule.chapterList ?? '',
      name: rule.chapterName ?? '',
      cover: rule.chapterCover,
      time: rule.chapterTime,
      result: rule.chapterResult ?? '',
      nextUrl: rule.chapterNextUrl,
      // 多线路支持
      multiRoads: rule.enableMultiRoads
        ? {
            enabled: true,
            roads: rule.chapterRoads,
            roadName: rule.chapterRoadName
          }
        : undefined,
      // any-reader 特有字段
      anyReader:
        rule.chapterItems || rule.chapterLock
          ? { items: rule.chapterItems, lock: rule.chapterLock }
          : undefined
    }
  }

  private convertChapterRuleFromUniversal(chapter: UniversalChapterRule): Partial<Rule> {
    return {
      chapterUrl: chapter.url,
      chapterList: chapter.list,
      chapterName: chapter.name,
      chapterCover: chapter.cover,
      chapterTime: chapter.time,
      chapterResult: chapter.result,
      chapterNextUrl: chapter.nextUrl,
      // 多线路支持
      enableMultiRoads: chapter.multiRoads?.enabled,
      chapterRoads: chapter.multiRoads?.roads,
      chapterRoadName: chapter.multiRoads?.roadName
    }
  }

  private convertDiscoverRuleToUniversal(rule: Rule): UniversalDiscoverRule {
    return {
      enabled: rule.enableDiscover ?? false,
      url: rule.discoverUrl ?? '',
      list: rule.discoverList ?? '',
      name: rule.discoverName ?? '',
      cover: rule.discoverCover,
      author: rule.discoverAuthor,
      description: rule.discoverDescription,
      tags: rule.discoverTags,
      latestChapter: rule.discoverChapter,
      result: rule.discoverResult ?? '',
      nextUrl: rule.discoverNextUrl,
      // any-reader 特有字段
      anyReader: rule.discoverItems ? { items: rule.discoverItems } : undefined
    }
  }

  private convertDiscoverRuleFromUniversal(discover: UniversalDiscoverRule): Partial<Rule> {
    return {
      enableDiscover: discover.enabled,
      discoverUrl: discover.url,
      discoverList: discover.list,
      discoverName: discover.name,
      discoverCover: discover.cover,
      discoverAuthor: discover.author,
      discoverDescription: discover.description,
      discoverTags: discover.tags,
      discoverChapter: discover.latestChapter,
      discoverResult: discover.result,
      discoverNextUrl: discover.nextUrl
    }
  }

  private convertContentRuleToUniversal(rule: Rule): UniversalContentRule {
    return {
      url: rule.contentUrl,
      items: rule.contentItems ?? '',
      nextUrl: rule.contentNextUrl,
      decoder: rule.contentDecoder
    }
  }

  private convertContentRuleFromUniversal(content: UniversalContentRule): Partial<Rule> {
    return {
      contentUrl: content.url,
      contentItems: content.items,
      contentNextUrl: content.nextUrl,
      contentDecoder: content.decoder
    }
  }
}

/**
 * 默认 any-reader 转换器实例
 */
export const anyReaderConverter = new AnyReaderConverter()
