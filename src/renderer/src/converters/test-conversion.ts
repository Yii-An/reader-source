/**
 * 规则转换测试脚本
 * 使用真实的 any-reader 和 Legado 规则进行测试
 */

import { anyReaderConverter, legadoConverter, detectRuleFormat } from './index'
import type { Rule } from '../types'
import type { LegadoRule } from '../types/legado'

// any-reader 示例规则
const anyReaderRule: Rule = {
  id: '4f14faea-ea01-4b47-abf2-d2a97479cd19',
  name: '爱小说',
  host: 'https://www.ixs.cc',
  contentType: 1,
  sort: 0,
  enableDiscover: true,
  discoverUrl: '玄幻::/xuanhuan_$page.html\n奇幻::/qihuan_$page.html\n修真::/xiuzhen_$page.html',
  discoverList: '//*[@class="left"]/section/ul/li[position()>1]',
  discoverName: '.n2@text',
  discoverAuthor: '.a2@text',
  discoverDescription: '.t@text',
  discoverResult: '.c2 a@href##\\d+\\.html',
  discoverChapter: '.c2@text',
  enableSearch: true,
  searchUrl: 'https://www.ixs.cc/search.htm?keyword=$keyword&pn=$page',
  searchList: '//*[@class="left"]/section/ul/li[position()>1]',
  searchName: '.n2@text',
  searchAuthor: '.a2@text',
  searchDescription: '.t@text',
  searchResult: '.c2 a@href##\\d+\\.html',
  searchChapter: '.c2@text',
  chapterList: '//*[@class="mulu"]/li/*[@rel="nofollow"]',
  chapterName: 'text',
  chapterResult: 'href',
  contentItems: '.content,.text@text'
}

// Legado 示例规则
const legadoRule: LegadoRule = {
  bookSourceUrl: 'https://www.aaawz.cc',
  bookSourceName: '3A小说',
  bookSourceGroup: '🎉 精选',
  bookSourceType: 0,
  customOrder: 2,
  enabled: true,
  enabledExplore: false,
  lastUpdateTime: 1756047901346,
  header: JSON.stringify({
    Accept: 'application/json, text/plain, */*',
    origin: 'https://www.aaawz.cc',
    referer: 'https://www.aaawz.cc/'
  }),
  searchUrl:
    '/api-search,{\n  "method": "POST",\n  "body": \'keyword={{key}}&page={{page}}&size=10\'\n}',
  ruleSearch: {
    bookList: 'data.books',
    name: 'articlename##<\\/?em>',
    author: 'author##<\\/?em>',
    coverUrl:
      "tid@js:let sid = java.getString('siteid');\n'/bookimg/'+sid+'/'+result%100+'/'+result+'.jpg'",
    lastChapter: 'lastchapter&&lastupdate##\\n##·',
    bookUrl: '/api-info-{{$.tid}}-{{$.siteid}}'
  },
  ruleBookInfo: {
    name: 'articlename',
    author: 'author',
    coverUrl: 'imgurl',
    intro: 'intro',
    lastChapter: "{{$.lastchapter}}·{{java.timeFormat(java.getString('$.lastupdate')*1000)}}",
    tocUrl: '/api-chapterlist-{{$.tid}}-{{$.siteid}}'
  },
  ruleToc: {
    chapterList: '*',
    chapterName: 'title',
    chapterUrl: "{{baseUrl.replace('list-','-')}}-{{$.cid}}",
    updateTime: "{{java.timeFormat(java.getString('$.update')*1000)}}更新 {{$.wordNum}}字"
  },
  ruleContent: {
    content: '@js:result'
  }
}

// 测试函数
export function testConversions(): void {
  console.log('=== 规则转换测试 ===\n')

  // 测试 1: 检测规则格式
  console.log('1. 格式检测:')
  console.log('   any-reader 规则:', detectRuleFormat(anyReaderRule))
  console.log('   Legado 规则:', detectRuleFormat(legadoRule))

  // 测试 2: any-reader -> Universal
  console.log('\n2. any-reader -> Universal:')
  const universalFromAnyReader = anyReaderConverter.toUniversal(anyReaderRule)
  console.log('   名称:', universalFromAnyReader.name)
  console.log('   Host:', universalFromAnyReader.host)
  console.log('   内容类型:', universalFromAnyReader.contentType)
  console.log('   搜索启用:', universalFromAnyReader.search?.enabled)
  console.log('   搜索列表规则:', universalFromAnyReader.search?.list)
  console.log('   章节列表规则:', universalFromAnyReader.chapter?.list)

  // 测试 3: Legado -> Universal
  console.log('\n3. Legado -> Universal:')
  const universalFromLegado = legadoConverter.toUniversal(legadoRule)
  console.log('   名称:', universalFromLegado.name)
  console.log('   Host:', universalFromLegado.host)
  console.log('   内容类型:', universalFromLegado.contentType)
  console.log('   搜索列表规则:', universalFromLegado.search?.list)
  console.log('   详情页名称规则:', universalFromLegado.detail?.name)
  console.log('   章节列表规则:', universalFromLegado.chapter?.list)

  // 测试 4: Universal -> any-reader (往返)
  console.log('\n4. Universal -> any-reader (往返):')
  const backToAnyReader = anyReaderConverter.fromUniversal(universalFromAnyReader)
  console.log('   名称匹配:', backToAnyReader.name === anyReaderRule.name)
  console.log('   搜索URL匹配:', backToAnyReader.searchUrl === anyReaderRule.searchUrl)
  console.log('   章节列表匹配:', backToAnyReader.chapterList === anyReaderRule.chapterList)

  // 测试 5: Legado -> any-reader
  console.log('\n5. Legado -> any-reader (跨格式):')
  const legadoToAnyReader = anyReaderConverter.fromUniversal(universalFromLegado)
  console.log('   名称:', legadoToAnyReader.name)
  console.log('   ID:', legadoToAnyReader.id)
  console.log('   搜索列表:', legadoToAnyReader.searchList)
  console.log('   章节列表:', legadoToAnyReader.chapterList)

  // 测试 6: any-reader -> Legado
  console.log('\n6. any-reader -> Legado (跨格式):')
  const anyReaderToLegado = legadoConverter.fromUniversal(universalFromAnyReader)
  console.log('   书源名称:', anyReaderToLegado.bookSourceName)
  console.log('   书源URL:', anyReaderToLegado.bookSourceUrl)
  console.log('   搜索列表:', anyReaderToLegado.ruleSearch?.bookList)
  console.log('   目录列表:', anyReaderToLegado.ruleToc?.chapterList)

  console.log('\n=== 测试完成 ===')
}

// 导出测试数据供外部使用
export { anyReaderRule, legadoRule }
