/**
 * Legado JSOUP Default 语法转换器
 * 将 Legado 特有的 JSOUP Default 语法转换为标准的 CSS 或 XPath 表达式
 *
 * JSOUP Default 语法格式：
 * - class.name.index@tag.name.index@attr
 * - 如: class.odd.0@tag.a.0@text
 *
 * 转换规则：
 * - class.name -> .name
 * - id.name -> #name
 * - tag.name -> name
 * - @text -> @text
 * - @href -> @href
 */

/**
 * JSOUP 段类型
 */
type JsoupSegmentType = 'class' | 'id' | 'tag' | 'text' | 'children' | 'attr'

/**
 * JSOUP 段
 */
interface JsoupSegment {
  type: JsoupSegmentType
  name?: string
  index?: number | 'all'
  attr?: string
}

/**
 * 检测是否为 JSOUP Default 语法
 */
export function isJsoupDefaultSyntax(expr: string): boolean {
  if (!expr || typeof expr !== 'string') {
    return false
  }

  const trimmed = expr.trim()

  // 已经有标准前缀的不是 JSOUP Default
  if (
    trimmed.startsWith('@css:') ||
    trimmed.startsWith('@xpath:') ||
    trimmed.startsWith('@XPath:') ||
    trimmed.startsWith('@json:') ||
    trimmed.startsWith('@js:') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('$.') ||
    trimmed.startsWith('<js>')
  ) {
    return false
  }

  // JSOUP Default 特征：包含 class. id. tag. 开头的段
  return /^(class|id|tag|text|children)\./i.test(trimmed)
}

/**
 * 解析 JSOUP Default 语法
 */
function parseJsoupSegments(expr: string): JsoupSegment[] {
  const segments: JsoupSegment[] = []
  const parts = expr.split('@')

  for (const part of parts) {
    if (!part) continue

    const subParts = part.split('.')
    if (subParts.length === 0) continue

    const typeLower = subParts[0].toLowerCase()

    switch (typeLower) {
      case 'class':
      case 'id':
      case 'tag':
        segments.push({
          type: typeLower as JsoupSegmentType,
          name: subParts[1],
          index: parseIndex(subParts[2])
        })
        break

      case 'text':
      case 'children':
        segments.push({ type: typeLower as JsoupSegmentType })
        break

      default:
        // 可能是属性，如 href, src
        if (
          ['text', 'html', 'innerhtml', 'outerhtml', 'href', 'src', 'alt', 'title'].includes(
            typeLower
          )
        ) {
          segments.push({
            type: 'attr',
            attr: typeLower === 'text' ? 'text' : typeLower
          })
        }
        break
    }
  }

  return segments
}

/**
 * 解析索引
 */
function parseIndex(indexStr?: string): number | 'all' | undefined {
  if (indexStr === undefined || indexStr === '') {
    return 'all'
  }
  const num = parseInt(indexStr, 10)
  return isNaN(num) ? 'all' : num
}

/**
 * 将 JSOUP Default 语法转换为 CSS 表达式
 */
export function jsoupToCss(expr: string): string {
  if (!isJsoupDefaultSyntax(expr)) {
    return expr
  }

  const segments = parseJsoupSegments(expr)
  let css = ''
  let attr = 'text' // 默认获取文本

  for (const seg of segments) {
    switch (seg.type) {
      case 'class':
        if (seg.name) {
          css += `.${seg.name}`
          if (seg.index !== undefined && seg.index !== 'all') {
            css += `:nth-child(${seg.index + 1})`
          }
        }
        break

      case 'id':
        if (seg.name) {
          css += `#${seg.name}`
        }
        break

      case 'tag':
        if (seg.name) {
          css += ` ${seg.name}`
          if (seg.index !== undefined && seg.index !== 'all') {
            css += `:nth-child(${seg.index + 1})`
          }
        }
        break

      case 'attr':
        if (seg.attr) {
          attr = seg.attr
        }
        break

      case 'children':
        css += ' > *'
        break
    }
  }

  return `@css:${css.trim()}@${attr}`
}

/**
 * 将 JSOUP Default 语法转换为 XPath 表达式
 */
export function jsoupToXPath(expr: string): string {
  if (!isJsoupDefaultSyntax(expr)) {
    return expr
  }

  const segments = parseJsoupSegments(expr)
  let xpath = ''
  let attr = 'text()' // 默认获取文本

  for (const seg of segments) {
    switch (seg.type) {
      case 'class':
        if (seg.name) {
          xpath += `//*[contains(@class, "${seg.name}")]`
          if (seg.index !== undefined && seg.index !== 'all') {
            xpath = `(${xpath})[${seg.index + 1}]`
          }
        }
        break

      case 'id':
        if (seg.name) {
          xpath += `//*[@id="${seg.name}"]`
        }
        break

      case 'tag':
        if (seg.name) {
          xpath += `//${seg.name}`
          if (seg.index !== undefined && seg.index !== 'all') {
            xpath = `(${xpath})[${seg.index + 1}]`
          }
        }
        break

      case 'attr':
        if (seg.attr) {
          attr = seg.attr === 'text' ? 'text()' : `@${seg.attr}`
        }
        break

      case 'children':
        xpath += '/*'
        break
    }
  }

  // 添加属性提取
  if (attr === 'text()') {
    xpath += '/text()'
  } else if (attr.startsWith('@')) {
    xpath += `/${attr}`
  }

  return `@xpath:${xpath}`
}

/**
 * 将 JSOUP Default 语法转换为标准表达式（优先使用 CSS）
 */
export function convertJsoupDefault(expr: string): string {
  if (!isJsoupDefaultSyntax(expr)) {
    return expr
  }

  // 优先使用 CSS，因为更简洁
  return jsoupToCss(expr)
}

/**
 * 批量转换表达式中的 JSOUP Default 语法
 */
export function convertAllJsoupDefault(
  exprs: Record<string, string | undefined>
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}

  for (const [key, value] of Object.entries(exprs)) {
    if (value && isJsoupDefaultSyntax(value)) {
      result[key] = convertJsoupDefault(value)
    } else {
      result[key] = value
    }
  }

  return result
}
