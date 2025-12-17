/**
 * 书源规则 JSON Schema 定义
 * 用于 Monaco Editor 的 JSON 验证和智能提示
 */

export const universalRuleSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://reader-source/schemas/universal-rule.json',
  title: 'Universal Rule',
  description: '书源规则规范 - Scripting Reader 插件规则格式',
  type: 'object',
  required: ['id', 'name', 'host', 'contentType'],
  properties: {
    id: {
      type: 'string',
      description: '规则唯一标识 (UUID 格式)'
    },
    name: {
      type: 'string',
      description: '规则名称',
      minLength: 1
    },
    host: {
      type: 'string',
      description: '规则域名 (如 https://example.com)'
    },
    icon: {
      type: 'string',
      description: '图标 URL'
    },
    author: {
      type: 'string',
      description: '规则作者'
    },
    group: {
      type: 'string',
      description: '规则分组'
    },
    sort: {
      type: 'integer',
      description: '排序权重',
      default: 0
    },
    enabled: {
      type: 'boolean',
      description: '是否启用规则',
      default: true
    },
    comment: {
      type: 'string',
      description: '规则备注说明'
    },
    jsLib: {
      type: 'string',
      description: 'JS 函数库 (复杂规则共用函数)'
    },
    contentType: {
      type: 'string',
      description: '内容类型',
      enum: ['novel', 'manga']
    },
    userAgent: {
      type: 'string',
      description: '自定义 User-Agent'
    },
    headers: {
      type: 'object',
      description: '自定义请求头',
      additionalProperties: { type: 'string' }
    },
    loadJs: {
      type: 'string',
      description: '全局 JS 脚本 (页面加载时执行)'
    },
    search: { $ref: '#/$defs/searchRule' },
    detail: { $ref: '#/$defs/detailRule' },
    chapter: { $ref: '#/$defs/chapterRule' },
    discover: { $ref: '#/$defs/discoverRule' },
    content: { $ref: '#/$defs/contentRule' },
    _meta: { $ref: '#/$defs/ruleMeta' }
  },
  $defs: {
    searchRule: {
      type: 'object',
      description: '搜索规则配置',
      properties: {
        enabled: { type: 'boolean', description: '是否启用搜索功能', default: true },
        url: { type: 'string', description: '搜索 URL 模板，使用 {{keyword}} 表示搜索词' },
        list: { type: 'string', description: '搜索结果列表选择器' },
        name: { type: 'string', description: '书名/标题选择器' },
        cover: { type: 'string', description: '封面图片选择器' },
        author: { type: 'string', description: '作者选择器' },
        description: { type: 'string', description: '简介/描述选择器' },
        latestChapter: { type: 'string', description: '最新章节选择器' },
        wordCount: { type: 'string', description: '字数选择器' },
        tags: { type: 'string', description: '标签/分类选择器' },
        result: { type: 'string', description: '结果 URL 选择器' }
      }
    },
    detailRule: {
      type: 'object',
      description: '详情页规则配置',
      properties: {
        enabled: { type: 'boolean', description: '是否启用详情页' },
        url: { type: 'string', description: '详情页 URL' },
        init: { type: 'string', description: '预处理规则' },
        name: { type: 'string', description: '书名选择器' },
        author: { type: 'string', description: '作者选择器' },
        cover: { type: 'string', description: '封面选择器' },
        description: { type: 'string', description: '简介选择器' },
        latestChapter: { type: 'string', description: '最新章节选择器' },
        wordCount: { type: 'string', description: '字数选择器' },
        tags: { type: 'string', description: '分类选择器' },
        tocUrl: { type: 'string', description: '目录 URL 选择器' },
        canRename: { type: 'boolean', description: '是否允许修改书名和作者' }
      }
    },
    chapterRule: {
      type: 'object',
      description: '章节/目录规则配置',
      properties: {
        url: { type: 'string', description: '章节列表 URL' },
        list: { type: 'string', description: '章节列表选择器' },
        name: { type: 'string', description: '章节名选择器' },
        cover: { type: 'string', description: '章节封面选择器' },
        time: { type: 'string', description: '更新时间选择器' },
        result: { type: 'string', description: '章节 URL 选择器' },
        nextUrl: { type: 'string', description: '下一页目录 URL' },
        isVip: { type: 'string', description: 'VIP 标识选择器' },
        isPay: { type: 'string', description: '付费标识选择器' },
        info: { type: 'string', description: '章节信息选择器' },
        multiRoads: {
          type: 'object',
          description: '多线路配置',
          properties: {
            enabled: { type: 'boolean', description: '是否启用多线路' },
            roads: { type: 'string', description: '线路列表选择器' },
            roadName: { type: 'string', description: '线路名选择器' }
          }
        }
      }
    },
    discoverRule: {
      type: 'object',
      description: '发现页规则配置',
      properties: {
        enabled: { type: 'boolean', description: '是否启用发现功能' },
        url: { type: 'string', description: '发现页 URL 或分类配置' },
        list: { type: 'string', description: '发现结果列表选择器' },
        name: { type: 'string', description: '名称选择器' },
        cover: { type: 'string', description: '封面选择器' },
        author: { type: 'string', description: '作者选择器' },
        description: { type: 'string', description: '描述选择器' },
        tags: { type: 'string', description: '标签选择器' },
        latestChapter: { type: 'string', description: '最新章节选择器' },
        wordCount: { type: 'string', description: '字数选择器' },
        result: { type: 'string', description: '结果 URL 选择器' },
        nextUrl: { type: 'string', description: '下一页 URL' }
      }
    },
    contentRule: {
      type: 'object',
      description: '正文/内容规则配置',
      properties: {
        url: { type: 'string', description: '正文页 URL' },
        items: { type: 'string', description: '正文内容选择器' },
        nextUrl: { type: 'string', description: '下一页正文 URL' },
        decoder: { type: 'string', description: '内容解密器脚本' },
        imageHeaders: { type: 'string', description: '图片请求头' },
        webView: { type: 'boolean', description: '是否使用 WebView 加载正文' },
        payAction: { type: 'string', description: '付费购买操作' },
        sourceRegex: { type: 'string', description: '资源正则' },
        replaceRules: {
          type: 'array',
          description: '正文净化替换规则',
          items: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: '匹配模式' },
              replacement: { type: 'string', description: '替换内容' },
              isRegex: { type: 'boolean', description: '是否为正则表达式' }
            }
          }
        }
      }
    },
    ruleMeta: {
      type: 'object',
      description: '规则元数据',
      properties: {
        sourceFormat: { type: 'string', description: '规则来源格式', enum: ['universal'] },
        version: { type: 'string', description: '规则版本' },
        createdAt: { type: 'integer', description: '创建时间 (时间戳)' },
        updatedAt: { type: 'integer', description: '更新时间 (时间戳)' }
      }
    }
  }
}
