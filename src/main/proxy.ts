import { ipcMain } from 'electron'
import * as cheerio from 'cheerio'
import puppeteer, { Browser, Page } from 'puppeteer'
import { JSONPath } from 'jsonpath-plus'

// ===== 配置变量（可通过设置修改）=====
const CLOUDFLARE_WAIT_TIME = 5000 // Cloudflare 等待时间（毫秒）
const CLOUDFLARE_MAX_RETRIES = 6 // 最大重试次数
const DEBUG_MODE = false // 调试模式：显示浏览器窗口

interface ProxyRequest {
  url: string
  userAgent?: string
}

interface ParseRequest {
  html: string
  listRule?: string
  contentRule?: string
  fields?: Record<string, string>
  host?: string
}

interface ProxyResponse {
  success: boolean
  html?: string
  url?: string
  error?: string
}

interface ParseResponse {
  success: boolean
  data?: unknown[]
  error?: string
}

interface ExecuteJsRequest {
  url: string
  jsCode: string
  userAgent?: string
}

interface ExecuteJsResponse {
  success: boolean
  data?: unknown
  error?: string
}

interface ParseInPageRequest {
  url: string
  listRule?: string
  contentRule?: string
  fields?: Record<string, string>
  host?: string
  userAgent?: string
}

interface CloudflareCheckResult {
  isCloudflare: boolean
  title: string
}

// 浏览器实例
let browser: Browser | null = null

/**
 * 获取或创建浏览器实例
 */
async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) {
    return browser
  }

  console.log('Launching browser with bundled Chromium...')
  console.log('Headless mode:', !DEBUG_MODE)

  browser = await puppeteer.launch({
    headless: !DEBUG_MODE, // DEBUG_MODE=true 时显示浏览器
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--lang=zh-CN,zh'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  })

  console.log('Browser launched successfully!')
  return browser
}

/**
 * 检测当前页面是否为 Cloudflare 验证页面
 */
async function checkCloudflare(page: Page): Promise<CloudflareCheckResult> {
  try {
    const result = await page.evaluate(() => {
      const title = document.title || ''
      const body = document.body ? document.body.innerText : ''
      const isCloudflare =
        title.includes('请稍候') ||
        title.includes('Just a moment') ||
        title.includes('Checking') ||
        body.includes('Checking your browser') ||
        body.includes('请稍候') ||
        body.includes('DDoS protection')
      return JSON.stringify({ isCloudflare, title })
    })
    return JSON.parse(result) as CloudflareCheckResult
  } catch {
    return { isCloudflare: false, title: '' }
  }
}

/**
 * 使用 Puppeteer 发起 HTTP 代理请求
 */
async function handleProxy(request: ProxyRequest): Promise<ProxyResponse> {
  const { url, userAgent } = request

  if (!url) {
    return { success: false, error: 'URL is required' }
  }

  let page: Page | null = null

  try {
    console.log('='.repeat(50))
    console.log('Fetching URL:', url)
    const browserInstance = await getBrowser()
    page = await browserInstance.newPage()

    // 设置 User-Agent
    await page.setUserAgent(
      userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // 设置视口
    await page.setViewport({ width: 1920, height: 1080 })

    // 设置额外的 HTTP 头
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    })

    // 设置超时
    page.setDefaultTimeout(60000)

    // 导航到页面
    console.log('Navigating to page...')
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    if (!response) {
      return { success: false, error: '页面加载失败' }
    }

    const status = response.status()
    console.log('Initial response status:', status)

    // Cloudflare 检测与等待重试逻辑
    let retryCount = 0
    let cfCheck = await checkCloudflare(page)

    while (cfCheck.isCloudflare && retryCount < CLOUDFLARE_MAX_RETRIES) {
      retryCount++
      console.log(
        `[Cloudflare] 检测到验证页面，等待 ${CLOUDFLARE_WAIT_TIME / 1000} 秒... (第 ${retryCount}/${CLOUDFLARE_MAX_RETRIES} 次)`
      )
      console.log(`[Cloudflare] 页面标题: "${cfCheck.title}"`)

      // 等待指定时间
      await new Promise((resolve) => setTimeout(resolve, CLOUDFLARE_WAIT_TIME))

      // 等待可能的网络请求完成和页面导航
      try {
        await page
          .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 })
          .catch(() => {})
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {})
      } catch {
        // 忽略超时错误
      }

      // 重新检测
      cfCheck = await checkCloudflare(page)
    }

    if (cfCheck.isCloudflare) {
      console.log(`[Cloudflare] 已达到最大重试次数 (${CLOUDFLARE_MAX_RETRIES})，验证未通过`)
      return { success: false, error: 'Cloudflare 验证未通过，请稍后重试' }
    }

    if (retryCount > 0) {
      console.log(`[Cloudflare] 验证通过! 共重试 ${retryCount} 次`)
      // 验证通过后，等待页面完全加载
      console.log('[Cloudflare] 等待页面完全加载...')
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {})
    }

    // 等待页面内容加载
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {})

    // 获取页面内容
    const html = await page.content()
    console.log('Got HTML content, length:', html.length)
    // 压缩 HTML 为一行并截断，避免日志过长
    const compressedHtml = html.replace(/\s+/g, ' ').substring(0, 200)
    console.log('HTML preview:', compressedHtml + (html.length > 200 ? '...' : ''))
    console.log('Final page title:', await page.title())
    console.log('='.repeat(50))

    return { success: true, html, url }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Proxy error:', message)
    return { success: false, error: message }
  } finally {
    if (page) {
      await page.close().catch(() => {})
    }
  }
}

/**
 * 检测是否为 XPath 规则
 */
function isXPathRule(rule: string): boolean {
  return rule.startsWith('//') || rule.startsWith('/')
}

/**
 * 将 XPath 规则转换为 CSS 选择器
 * 支持常见的 XPath 语法：
 * - //*[@class="xxx"] -> .xxx
 * - //div[@class="xxx"] -> div.xxx
 * - //div/section/ul/li -> div section ul li
 * - li[position()>1] -> li:nth-child(n+2)
 * - li[last()] -> li:last-child
 * - li[1] -> li:nth-child(1)
 */
function xpathToCssSelector(xpath: string): string {
  console.log('[XPath] Converting:', xpath)

  let css = xpath
    // 移除开头的 // 或 /
    .replace(/^\/\/\*/, '*')
    .replace(/^\/\//, '')
    .replace(/^\//, '')

  // 处理 [@class="xxx"] -> .xxx
  css = css.replace(/\[@class="([^"]+)"\]/g, '.$1')
  css = css.replace(/\[@class='([^']+)'\]/g, '.$1')

  // 处理 [@id="xxx"] -> #xxx
  css = css.replace(/\[@id="([^"]+)"\]/g, '#$1')
  css = css.replace(/\[@id='([^']+)'\]/g, '#$1')

  // 处理 [@attr="value"] -> [attr="value"]
  css = css.replace(/\[@([^=\]]+)="([^"]+)"\]/g, '[$1="$2"]')
  css = css.replace(/\[@([^=\]]+)='([^']+)'\]/g, "[$1='$2']")

  // 处理 [position()>n] -> :nth-child(n+N+1)
  css = css.replace(/\[position\(\)>(\d+)\]/g, (_, n) => `:nth-child(n+${parseInt(n) + 1})`)
  css = css.replace(/\[position\(\)>=(\d+)\]/g, (_, n) => `:nth-child(n+${parseInt(n)})`)
  css = css.replace(/\[position\(\)<(\d+)\]/g, (_, n) => `:nth-child(-n+${parseInt(n) - 1})`)
  css = css.replace(/\[position\(\)<=(\d+)\]/g, (_, n) => `:nth-child(-n+${parseInt(n)})`)

  // 处理 [last()] -> :last-child
  css = css.replace(/\[last\(\)\]/g, ':last-child')

  // 处理 [n] (索引) -> :nth-child(n)
  css = css.replace(/\[(\d+)\]/g, ':nth-child($1)')

  // 将 / 转换为空格（子元素选择器）
  css = css.replace(/\//g, ' ')

  // 清理多余空格
  css = css.replace(/\s+/g, ' ').trim()

  console.log('[XPath] Converted to CSS:', css)
  return css
}

/**
 * 解析 HTML 内容
 */
function handleParse(request: ParseRequest): ParseResponse {
  const { html, listRule, contentRule, fields, host } = request

  console.log('[Parse] ========== 开始解析 ==========')
  console.log('[Parse] 请求参数:')
  console.log(`  ├── host: ${host || '(未设置)'}`)
  console.log(`  ├── listRule: ${listRule || '(未设置)'}`)
  console.log(`  ├── contentRule: ${contentRule || '(未设置)'}`)
  console.log(`  └── fields: ${JSON.stringify(fields || {})}`)
  console.log(`[Parse] HTML 长度: ${html?.length || 0} 字符`)

  if (!html) {
    console.log('[Parse] ❌ 错误: HTML 内容为空')
    return { success: false, error: 'HTML is required' }
  }

  try {
    const $ = cheerio.load(html)

    if (contentRule) {
      const content: string[] = []
      let selector = contentRule.trim()
      let attr = 'text' // 默认提取文本

      // 解析 @attr 部分
      const attrMatch = selector.match(/@([a-zA-Z-]+)$/)
      if (attrMatch) {
        attr = attrMatch[1]
        selector = selector.slice(0, -attrMatch[0].length).trim()
      }

      // 对于 XPath 规则，转换为 CSS
      if (isXPathRule(selector)) {
        console.log('[Parse] Content rule (XPath):', selector, '@' + attr)
        selector = xpathToCssSelector(selector)
      } else {
        console.log('[Parse] Content rule (CSS):', selector, '@' + attr)
      }

      console.log('[Parse] Final content selector:', selector, 'attr:', attr)

      $(selector).each((_, el) => {
        let value = ''
        const $el = $(el)

        switch (attr) {
          case 'text':
            value = $el.text().trim()
            break
          case 'html':
            value = $el.html() || ''
            break
          case 'src':
            value = $el.attr('src') || ''
            break
          case 'href':
            value = $el.attr('href') || ''
            break
          default:
            // 支持任意属性如 data-original, data-src 等
            value = $el.attr(attr) || ''
        }

        if (value) content.push(value)
      })

      console.log('[Parse] Found content items:', content.length)
      if (content.length > 0) {
        console.log('[Parse] First content sample:', content[0].substring(0, 100))
      }
      return { success: true, data: content }
    }

    // 检测是否为 JSONPath 规则
    const isJsonPath = (rule: string): boolean => rule.startsWith('$.') || rule.startsWith('@json:')

    if (listRule && fields && isJsonPath(listRule.trim())) {
      // JSONPath 解析
      const jsonPathRule = listRule.trim().replace(/^@json:/, '')
      console.log('[Parse] List rule (JSONPath):', jsonPathRule)
      console.log('[Parse] Fields:', JSON.stringify(fields))

      try {
        // 尝试解析 JSON（处理 Puppeteer 返回的 HTML 包裹的 JSON）
        let jsonStr = html

        // 如果是 HTML 包裹的 JSON（Puppeteer 渲染结果），从 <pre> 或 <body> 中提取
        if (html.trim().startsWith('<')) {
          console.log('[Parse] 检测到 HTML 包裹，尝试提取 JSON...')
          // 尝试从 <pre> 标签中提取
          const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
          if (preMatch) {
            jsonStr = preMatch[1]
            console.log('[Parse] 从 <pre> 标签提取 JSON，长度:', jsonStr.length)
          } else {
            // 尝试从 <body> 标签中提取
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
            if (bodyMatch) {
              jsonStr = bodyMatch[1].replace(/<[^>]+>/g, '').trim()
              console.log('[Parse] 从 <body> 标签提取 JSON，长度:', jsonStr.length)
            }
          }
        }

        const jsonData = JSON.parse(jsonStr)
        console.log('[Parse] JSON 解析成功')

        // 使用 JSONPath 提取列表
        let items = JSONPath({ path: jsonPathRule, json: jsonData })
        console.log('[Parse] JSONPath 匹配到', items.length, '个元素')

        // 如果结果是嵌套数组（如 $..lists 返回 [[item1, item2...]]），展平它
        if (items.length === 1 && Array.isArray(items[0])) {
          console.log('[Parse] 检测到嵌套数组，展平处理')
          items = items[0]
          console.log('[Parse] 展平后元素数:', items.length)
        }

        const results: Record<string, unknown>[] = []
        for (let i = 0; i < items.length; i++) {
          const item: Record<string, unknown> = {}
          const dataItem = items[i]

          // 只为第一个 item 打印详细日志
          if (i === 0) {
            console.log('[Parse] ========== 解析第 1 个列表项 ==========')
            console.log('[Parse] Item JSON:', JSON.stringify(dataItem).substring(0, 300))
          }

          for (const [key, fieldRule] of Object.entries(fields)) {
            if (!fieldRule) continue
            const rule = String(fieldRule)

            if (rule.startsWith('$.')) {
              // JSONPath 提取
              const values = JSONPath({ path: rule, json: dataItem })
              item[key] = values.length > 0 ? values[0] : ''
              if (i === 0) {
                console.log(
                  `[Parse:${key}] JSONPath: "${rule}" -> "${String(item[key]).substring(0, 50)}"`
                )
              }
            } else if (rule.startsWith('@js:')) {
              // JavaScript 规则暂不支持
              if (i === 0) console.log(`[Parse:${key}] @js: 规则暂不支持`)
              item[key] = ''
            } else {
              // 直接字段名
              item[key] = dataItem[rule] || dataItem[key] || ''
              if (i === 0) {
                console.log(
                  `[Parse:${key}] 直接字段: "${rule}" -> "${String(item[key]).substring(0, 50)}"`
                )
              }
            }
          }

          if (item.name || item.url) {
            results.push(item)
          }
        }

        // 详细的结果统计日志
        console.log('[Parse] ========== 解析完成 ==========')
        console.log(`[Parse] ✅ 匹配到 ${results.length} 条结果`)
        if (results.length > 0) {
          console.log('[Parse] 前3条示例数据:')
          results.slice(0, 3).forEach((it, idx) => {
            console.log(`  ${idx + 1}. name: "${String(it.name || '').substring(0, 50)}"`)
            console.log(`     url: "${String(it.url || '').substring(0, 100)}"`)
          })
        }
        return { success: true, data: results }
      } catch (jsonError) {
        const msg = jsonError instanceof Error ? jsonError.message : String(jsonError)
        console.log('[Parse] ❌ JSON 解析失败:', msg)
        return { success: false, error: `JSON 解析失败: ${msg}` }
      }
    }

    if (listRule && fields) {
      const results: Record<string, unknown>[] = []
      // 对于 XPath 规则，不移除 @ 字符
      let selector = listRule.trim()
      if (isXPathRule(selector)) {
        console.log('[Parse] List rule (XPath):', selector)
        selector = xpathToCssSelector(selector)
      } else {
        // CSS 规则：移除末尾的 @attr 部分
        selector = selector.replace(/@[^@[\]]*$/, '').trim()
        console.log('[Parse] List rule (CSS):', selector)
      }
      console.log('[Parse] Final selector:', selector)
      console.log('[Parse] Fields:', JSON.stringify(fields))

      const $listItems = $(selector)
      console.log('[Parse] 列表选择器匹配到', $listItems.length, '个元素')

      $listItems.each((index, element) => {
        const item: Record<string, unknown> = {}
        const $el = $(element)

        // 只打印第一个 item 的 HTML 预览
        if (index === 0) {
          const itemHtml = ($el.prop('outerHTML') || '').replace(/\s+/g, ' ')
          console.log('[Parse] ========== 解析第 1 个列表项 ==========')
          console.log(
            '[Parse] Item HTML (前200字符):',
            itemHtml.substring(0, 200) + (itemHtml.length > 200 ? '...' : '')
          )
        }

        for (const [key, rule] of Object.entries(fields)) {
          if (!rule) continue
          // 只为第一个 item 打印详细日志
          if (index === 0) {
            item[key] = extractValue($el, rule, host, key)
          } else {
            item[key] = extractValueSilent($el, rule, host)
          }
        }

        if (item.name || item.url) {
          results.push(item)
        }
      })

      // 详细的结果统计日志
      console.log('[Parse] ========== 解析完成 ==========')
      console.log(`[Parse] ✅ 匹配到 ${results.length} 条结果`)
      if (results.length > 0) {
        console.log('[Parse] 前3条示例数据:')
        results.slice(0, 3).forEach((item, idx) => {
          console.log(`  ${idx + 1}. name: "${String(item.name || '').substring(0, 50)}"`)
          console.log(`     url: "${String(item.url || '').substring(0, 100)}"`)
          if (item.author) console.log(`     author: "${String(item.author).substring(0, 30)}"`)
          if (item.cover) console.log(`     cover: "${String(item.cover).substring(0, 80)}"`)
        })
      }
      return { success: true, data: results }
    }

    // 只有 fields 没有 listRule 时，在整个文档上直接提取字段
    if (!listRule && fields) {
      console.log('[Parse] 无列表规则，直接在文档根节点提取字段')
      const item: Record<string, unknown> = {}
      const $root = $.root()

      for (const [key, rule] of Object.entries(fields)) {
        if (!rule) continue
        item[key] = extractValue($root, rule, host, key)
      }

      console.log('[Parse] ========== 解析完成 ==========')
      console.log('[Parse] 提取的字段:', JSON.stringify(item))
      return { success: true, data: [item] }
    }

    return { success: false, error: 'Invalid parse request' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Parse] Error:', message)
    return { success: false, error: message }
  }
}

// 支持的简写属性关键词
const SHORTHAND_ATTRS = ['text', 'href', 'src']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractValue($context: any, rule: string, host?: string, fieldName?: string): string {
  // 空规则直接返回空字符串
  if (!rule || !rule.trim()) {
    return ''
  }

  const logPrefix = fieldName ? `[Parse:${fieldName}]` : '[Parse:extractValue]'

  // 解析 ##pattern##replacement 正则替换语法
  let replacePattern: string | null = null
  let replaceWith: string | null = null
  const replaceMatch = rule.match(/##([^#]*)##([^#]*)$/)
  if (replaceMatch) {
    replacePattern = replaceMatch[1]
    replaceWith = replaceMatch[2]
    rule = rule.slice(0, -replaceMatch[0].length) // 移除替换部分
    console.log(`${logPrefix} 规则: "${rule}" 正则替换: ##${replacePattern}##${replaceWith}`)
  } else {
    console.log(`${logPrefix} 规则: "${rule}"`)
  }

  const atIndex = rule.lastIndexOf('@')
  let selector = ''
  let attr = 'text'

  // 检查是否为简写属性关键词（text, href, src）
  if (SHORTHAND_ATTRS.includes(rule)) {
    attr = rule
    selector = ''
  } else if (rule.startsWith('@')) {
    attr = rule.slice(1)
  } else if (atIndex > 0) {
    selector = rule.substring(0, atIndex).trim()
    attr = rule.substring(atIndex + 1).trim()
  } else {
    selector = rule
  }

  console.log(`${logPrefix} 选择器: "${selector}", 属性: "${attr}"`)

  let $target = selector ? $context.find(selector) : $context
  const foundCount = $target.length
  console.log(`${logPrefix} 找到 ${foundCount} 个元素`)

  if ($target.length === 0) {
    console.log(`${logPrefix} 未找到元素，使用上下文元素`)
    $target = $context
  }

  // 打印目标元素的 HTML 预览（压缩为一行）
  const targetHtml = ($target.first().prop('outerHTML') || '').replace(/\s+/g, ' ')
  console.log(
    `${logPrefix} 目标元素 HTML (前200字符): ${targetHtml.substring(0, 200)}${targetHtml.length > 200 ? '...' : ''}`
  )

  let value = ''
  switch (attr) {
    case 'text':
      value = $target.first().text().trim()
      break
    case 'html':
      value = $target.first().html() || ''
      break
    case 'href':
      value = $target.first().attr('href') || ''
      break
    case 'src':
      value = $target.first().attr('src') || ''
      break
    default:
      value = $target.first().attr(attr) || $target.first().text().trim()
  }

  // 压缩换行符以便日志显示在一行
  const compressedValue = value.replace(/\s+/g, ' ').substring(0, 100)
  console.log(`${logPrefix} 原始值: "${compressedValue}${value.length > 100 ? '...' : ''}"`)

  // 应用正则替换
  if (replacePattern !== null && replaceWith !== null) {
    try {
      const regex = new RegExp(replacePattern)
      const originalValue = value
      value = value.replace(regex, replaceWith)
      console.log(
        `${logPrefix} 正则替换后: "${value}" (原值: "${originalValue.substring(0, 100)}")`
      )
    } catch (e) {
      console.error(`${logPrefix} 正则替换失败:`, e)
    }
  }

  // 处理相对 URL
  if ((attr === 'href' || attr === 'src') && value && host && !value.startsWith('http')) {
    // 协议相对 URL（以 // 开头）：补全协议
    if (value.startsWith('//')) {
      const protocol = host.startsWith('https') ? 'https:' : 'http:'
      value = protocol + value
    } else {
      // 普通相对路径：拼接 host
      const baseHost = host.endsWith('/') ? host.slice(0, -1) : host
      value = value.startsWith('/') ? baseHost + value : baseHost + '/' + value
    }
    console.log(`${logPrefix} URL 补全后: "${value}"`)
  }

  const finalCompressed = value.replace(/\s+/g, ' ').substring(0, 100)
  console.log(`${logPrefix} 最终值: "${finalCompressed}${value.length > 100 ? '...' : ''}"`)
  return value
}

/**
 * 静默版本的 extractValue，不打印日志
 * 用于除第一个 item 之外的其他项目，避免日志过多
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractValueSilent($context: any, rule: string, host?: string): string {
  // 空规则直接返回空字符串
  if (!rule || !rule.trim()) {
    return ''
  }

  // 解析 ##pattern##replacement 正则替换语法
  let replacePattern: string | null = null
  let replaceWith: string | null = null
  const replaceMatch = rule.match(/##([^#]*)##([^#]*)$/)
  if (replaceMatch) {
    replacePattern = replaceMatch[1]
    replaceWith = replaceMatch[2]
    rule = rule.slice(0, -replaceMatch[0].length)
  }

  const atIndex = rule.lastIndexOf('@')
  let selector = ''
  let attr = 'text'

  // 检查是否为简写属性关键词（text, href, src）
  if (SHORTHAND_ATTRS.includes(rule)) {
    attr = rule
    selector = ''
  } else if (rule.startsWith('@')) {
    attr = rule.slice(1)
  } else if (atIndex > 0) {
    selector = rule.substring(0, atIndex).trim()
    attr = rule.substring(atIndex + 1).trim()
  } else {
    selector = rule
  }

  let $target = selector ? $context.find(selector) : $context
  if ($target.length === 0) $target = $context

  let value = ''
  switch (attr) {
    case 'text':
      value = $target.first().text().trim()
      break
    case 'html':
      value = $target.first().html() || ''
      break
    case 'href':
      value = $target.first().attr('href') || ''
      break
    case 'src':
      value = $target.first().attr('src') || ''
      break
    default:
      value = $target.first().attr(attr) || $target.first().text().trim()
  }

  // 应用正则替换
  if (replacePattern !== null && replaceWith !== null) {
    try {
      const regex = new RegExp(replacePattern)
      value = value.replace(regex, replaceWith)
    } catch {
      // 忽略错误
    }
  }

  // 处理相对 URL
  if ((attr === 'href' || attr === 'src') && value && host && !value.startsWith('http')) {
    // 协议相对 URL（以 // 开头）：补全协议
    if (value.startsWith('//')) {
      const protocol = host.startsWith('https') ? 'https:' : 'http:'
      value = protocol + value
    } else {
      // 普通相对路径：拼接 host
      const baseHost = host.endsWith('/') ? host.slice(0, -1) : host
      value = value.startsWith('/') ? baseHost + value : baseHost + '/' + value
    }
  }

  return value
}

/**
 * 执行 JavaScript 规则
 * 先获取页面 HTML，然后在 Node.js 环境中执行 JS 代码
 */
async function handleExecuteJs(request: ExecuteJsRequest): Promise<ExecuteJsResponse> {
  const { url, jsCode, userAgent } = request

  if (!url || !jsCode) {
    return { success: false, error: 'URL and jsCode are required' }
  }

  let page: Page | null = null

  try {
    console.log('='.repeat(50))
    console.log('[ExecuteJs] Fetching URL:', url)
    const browserInstance = await getBrowser()
    page = await browserInstance.newPage()

    // 设置 User-Agent
    await page.setUserAgent(
      userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // 设置视口
    await page.setViewport({ width: 1920, height: 1080 })

    // 设置额外的 HTTP 头
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    })

    // 设置超时
    page.setDefaultTimeout(60000)

    // 处理 about:blank 的特殊情况（用于纯 JS 执行，不需要页面内容）
    let html = ''
    if (url === 'about:blank' || !url) {
      console.log('[ExecuteJs] Using empty page for pure JS execution')
      html = ''
    } else {
      // 导航到页面
      console.log('[ExecuteJs] Navigating to page...')
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      if (!response) {
        return { success: false, error: '页面加载失败' }
      }

      console.log('[ExecuteJs] Initial response status:', response.status())

      // Cloudflare 检测与等待
      let retryCount = 0
      let cfCheck = await checkCloudflare(page)

      while (cfCheck.isCloudflare && retryCount < CLOUDFLARE_MAX_RETRIES) {
        retryCount++
        console.log(
          `[Cloudflare] 检测到验证页面，等待 ${CLOUDFLARE_WAIT_TIME / 1000} 秒... (第 ${retryCount}/${CLOUDFLARE_MAX_RETRIES} 次)`
        )
        await new Promise((resolve) => setTimeout(resolve, CLOUDFLARE_WAIT_TIME))
        try {
          await page
            .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 })
            .catch(() => {})
          await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {})
        } catch {
          // 忽略超时错误
        }
        cfCheck = await checkCloudflare(page)
      }

      if (cfCheck.isCloudflare) {
        return { success: false, error: 'Cloudflare 验证未通过，请稍后重试' }
      }

      // 等待页面内容加载
      await page.waitForSelector('body', { timeout: 5000 }).catch(() => {})

      // 获取页面 HTML
      html = await page.content()
      console.log('[ExecuteJs] Got HTML content, length:', html.length)
    }

    // 预处理 JS 代码
    const cleanedCode = jsCode
      .replace(/^@js:\s*/i, '') // 移除 @js: 前缀
      .replace(/\n@json:[^\n]*$/i, '') // 移除 @json: 后缀（JSONPath 查询）
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除 /* */ 注释
      .replace(/^\s*\/\/.*$/gm, '') // 移除单行 // 注释
      .trim()

    console.log('[ExecuteJs] Cleaned JS code length:', cleanedCode.length)
    console.log('[ExecuteJs] Cleaned JS code (first 500 chars):', cleanedCode.substring(0, 500))
    console.log(
      '[ExecuteJs] Cleaned JS code (last 200 chars):',
      cleanedCode.substring(cleanedCode.length - 200)
    )

    // 在页面上下文中执行 JavaScript
    // result 变量包含页面 HTML
    const data = await page.evaluate(
      (params: { html: string; code: string }) => {
        try {
          // 注入 result 变量，使其包含页面 HTML，供用户脚本使用
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = params.html
          void result // 显式使用变量以避免 TS 错误
          // 使用 eval，它会返回最后一个表达式的值
          return eval(params.code)
        } catch (e) {
          const err = e as Error
          return { error: err.message, stack: err.stack }
        }
      },
      { html, code: cleanedCode }
    )

    console.log('[ExecuteJs] Execution result type:', typeof data)
    if (data && typeof data === 'object') {
      console.log('[ExecuteJs] Execution result:', JSON.stringify(data).substring(0, 500))
    } else {
      console.log('[ExecuteJs] Execution result:', String(data).substring(0, 500))
    }
    console.log('='.repeat(50))

    if (data && typeof data === 'object' && 'error' in data) {
      return { success: false, error: String(data.error) }
    }

    return { success: true, data }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ExecuteJs] Error:', message)
    return { success: false, error: message }
  } finally {
    if (page) {
      await page.close().catch(() => {})
    }
  }
}

/**
 * 在页面上下文中解析内容（支持原生 XPath）
 * 使用 Puppeteer 打开页面，然后在浏览器中执行 document.evaluate() 进行 XPath 查询
 */
async function handleParseInPage(request: ParseInPageRequest): Promise<ParseResponse> {
  const { url, listRule, contentRule, fields, host, userAgent } = request

  if (!url) {
    return { success: false, error: 'URL is required' }
  }

  let page: Page | null = null

  try {
    console.log('='.repeat(50))
    console.log('[ParseInPage] URL:', url)
    console.log('[ParseInPage] listRule:', listRule)
    console.log('[ParseInPage] contentRule:', contentRule)
    console.log('[ParseInPage] fields:', JSON.stringify(fields))

    const browserInstance = await getBrowser()
    page = await browserInstance.newPage()

    // 设置 User-Agent
    await page.setUserAgent(
      userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // 设置视口
    await page.setViewport({ width: 1920, height: 1080 })

    // 设置额外的 HTTP 头
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    })

    // 设置超时
    page.setDefaultTimeout(60000)

    // 导航到页面
    console.log('[ParseInPage] Navigating to page...')
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    if (!response) {
      return { success: false, error: '页面加载失败' }
    }

    console.log('[ParseInPage] Response status:', response.status())

    // Cloudflare 检测与等待
    let retryCount = 0
    let cfCheck = await checkCloudflare(page)

    while (cfCheck.isCloudflare && retryCount < CLOUDFLARE_MAX_RETRIES) {
      retryCount++
      console.log(
        `[Cloudflare] 检测到验证页面，等待 ${CLOUDFLARE_WAIT_TIME / 1000} 秒... (第 ${retryCount}/${CLOUDFLARE_MAX_RETRIES} 次)`
      )
      await new Promise((resolve) => setTimeout(resolve, CLOUDFLARE_WAIT_TIME))
      try {
        await page
          .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 })
          .catch(() => {})
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {})
      } catch {
        // 忽略超时错误
      }
      cfCheck = await checkCloudflare(page)
    }

    if (cfCheck.isCloudflare) {
      return { success: false, error: 'Cloudflare 验证未通过，请稍后重试' }
    }

    // 等待页面内容加载
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {})

    // 在页面上下文中执行解析
    const parseParams = {
      listRule: listRule || '',
      contentRule: contentRule || '',
      fields: fields || {},
      host: host || ''
    }

    const results = await page.evaluate((params) => {
      // 辅助函数：检测是否为 XPath
      function isXPath(rule: string): boolean {
        return rule.startsWith('//') || rule.startsWith('/')
      }

      // 辅助函数：通过 XPath 获取元素
      function getElementsByXPath(xpath: string, context: Node = document): Element[] {
        const result = document.evaluate(
          xpath,
          context,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        )
        const elements: Element[] = []
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i)
          if (node && node.nodeType === Node.ELEMENT_NODE) {
            elements.push(node as Element)
          }
        }
        return elements
      }

      // 辅助函数：通过 CSS 选择器获取元素
      function getElementsByCSS(
        selector: string,
        context: Element | Document = document
      ): Element[] {
        try {
          return Array.from(context.querySelectorAll(selector))
        } catch {
          return []
        }
      }

      // 辅助函数：从规则中提取值（带日志收集）
      function extractValue(
        element: Element,
        rule: string,
        host: string,
        fieldName: string,
        itemIndex: number,
        logs: string[]
      ): string {
        if (!rule) return ''

        // 解析 ##pattern##replacement 或 ##pattern 正则替换语法
        let replacePattern: string | null = null
        let replaceWith: string | null = null
        let cleanRule = rule

        // 优先匹配 ##pattern##replacement 格式
        const doubleMatch = rule.match(/##([^#]*)##([^#]*)$/)
        if (doubleMatch) {
          replacePattern = doubleMatch[1]
          replaceWith = doubleMatch[2]
          cleanRule = rule.slice(0, -doubleMatch[0].length)
        } else {
          // 匹配 ##pattern 格式（删除匹配内容）
          const singleMatch = rule.match(/##([^#]+)$/)
          if (singleMatch) {
            replacePattern = singleMatch[1]
            replaceWith = ''
            cleanRule = rule.slice(0, -singleMatch[0].length)
          }
        }

        // 支持的简写属性关键词
        const SHORTHAND_ATTRS = ['text', 'href', 'src']

        // 解析规则：selector@attr 或 @attr 或简写关键词
        const atIndex = cleanRule.lastIndexOf('@')
        let selector = ''
        let attr = 'text'

        // 检查是否为简写属性关键词（text, href, src）
        if (SHORTHAND_ATTRS.includes(cleanRule)) {
          attr = cleanRule
          selector = ''
        } else if (cleanRule.startsWith('@')) {
          attr = cleanRule.slice(1)
        } else if (atIndex > 0) {
          selector = cleanRule.substring(0, atIndex).trim()
          attr = cleanRule.substring(atIndex + 1).trim()
        } else {
          selector = cleanRule
        }

        // 只为第一个item记录详细日志
        if (itemIndex === 0) {
          logs.push(`[字段:${fieldName}] 规则: "${rule}"`)
          logs.push(`  ├── 选择器: "${selector || '(无)'}", 属性: "${attr}"`)
        }

        // 查找目标元素
        let target: Element | null = element
        if (selector) {
          if (isXPath(selector)) {
            // 相对 XPath 查询
            const relativeXPath = selector.startsWith('.') ? selector : '.' + selector
            const found = getElementsByXPath(relativeXPath, element)
            target = found.length > 0 ? found[0] : null
          } else {
            target = element.querySelector(selector)
          }
        }

        if (!target) {
          if (itemIndex === 0) logs.push(`  └── 结果: (未找到元素)`)
          return ''
        }

        // 打印目标元素预览
        if (itemIndex === 0) {
          const preview = target.outerHTML?.substring(0, 150) || ''
          logs.push(`  ├── 目标元素: ${preview}...`)
        }

        // 提取属性值
        let value = ''
        switch (attr) {
          case 'text':
            value = (target.textContent || '').trim()
            break
          case 'html':
            value = target.innerHTML || ''
            break
          case 'href':
            value = target.getAttribute('href') || ''
            break
          case 'src':
            value = target.getAttribute('src') || ''
            break
          default:
            value = target.getAttribute(attr) || (target.textContent || '').trim()
        }

        if (itemIndex === 0) logs.push(`  ├── 原始值: "${value.substring(0, 100)}"`)

        // 应用正则替换
        if (replacePattern !== null && replaceWith !== null) {
          try {
            const regex = new RegExp(replacePattern)
            value = value.replace(regex, replaceWith)
            if (itemIndex === 0) logs.push(`  ├── 正则替换后: "${value.substring(0, 100)}"`)
          } catch {
            // 忽略正则错误
          }
        }

        // 处理相对 URL
        if ((attr === 'href' || attr === 'src') && value && host && !value.startsWith('http')) {
          // 协议相对 URL（以 // 开头）：补全协议
          if (value.startsWith('//')) {
            const protocol = host.startsWith('https') ? 'https:' : 'http:'
            value = protocol + value
          } else {
            // 普通相对路径：拼接 host
            const baseHost = host.endsWith('/') ? host.slice(0, -1) : host
            value = value.startsWith('/') ? baseHost + value : baseHost + '/' + value
          }
          if (itemIndex === 0) logs.push(`  ├── URL补全后: "${value.substring(0, 100)}"`)
        }

        if (itemIndex === 0) logs.push(`  └── 最终值: "${value.substring(0, 100)}"`)
        return value
      }

      // 主逻辑
      const logs: string[] = []
      try {
        // 处理正文规则
        if (params.contentRule) {
          const rule = params.contentRule.trim()
          const content: string[] = []
          let elements: Element[] = []

          if (isXPath(rule)) {
            logs.push(`[列表] 使用 XPath 规则: ${rule}`)
            elements = getElementsByXPath(rule)
          } else {
            // CSS 规则可能包含 @attr，需要移除
            const selector = rule.replace(/@[^@[\]]*$/, '').trim()
            logs.push(`[列表] 使用 CSS 规则: ${selector}`)
            elements = getElementsByCSS(selector)
          }

          logs.push(`[列表] 匹配到 ${elements.length} 个元素`)

          for (const el of elements) {
            const text = (el.textContent || '').trim()
            if (text) content.push(text)
          }

          return { success: true, data: content, type: 'content', count: content.length, logs }
        }

        // 处理列表规则
        if (params.listRule) {
          const rule = params.listRule.trim()
          const items: Record<string, unknown>[] = []
          let elements: Element[] = []

          if (isXPath(rule)) {
            logs.push(`[列表] 使用 XPath 规则: ${rule}`)
            elements = getElementsByXPath(rule)
          } else {
            // CSS 规则可能包含 @attr，需要移除
            const selector = rule.replace(/@[^@[\]]*$/, '').trim()
            logs.push(`[列表] 使用 CSS 规则: ${selector}`)
            elements = getElementsByCSS(selector)
          }

          logs.push(`[列表] 匹配到 ${elements.length} 个元素`)

          // 只为第一个元素打印 HTML 预览
          if (elements.length > 0) {
            const preview = elements[0].outerHTML?.substring(0, 300) || ''
            logs.push(`[列表] 第1个元素预览: ${preview}...`)
            logs.push(`[列表] ========== 解析第1个列表项字段 ==========`)
          }

          for (let i = 0; i < elements.length; i++) {
            const el = elements[i]
            const item: Record<string, unknown> = {}

            for (const [key, fieldRule] of Object.entries(params.fields)) {
              if (!fieldRule) continue
              item[key] = extractValue(el, fieldRule as string, params.host, key, i, logs)
            }

            if (item.name || item.url) {
              items.push(item)
            }
          }

          return { success: true, data: items, type: 'list', count: items.length, logs }
        }

        return { success: false, error: 'No rule provided', logs }
      } catch (e) {
        const err = e as Error
        return { success: false, error: err.message, logs }
      }
    }, parseParams)

    // 打印从浏览器收集的日志
    if (results.logs && results.logs.length > 0) {
      console.log('[ParseInPage] ========== 字段解析详情 ==========')
      for (const log of results.logs) {
        console.log(`[ParseInPage] ${log}`)
      }
    }

    // 详细的结果日志
    console.log('[ParseInPage] ========== 解析完成 ==========')
    if (results.success) {
      const data = results.data as Record<string, unknown>[]
      console.log(`[ParseInPage] ✅ 匹配到 ${data?.length || 0} 条结果 (type: ${results.type})`)
      if (data && data.length > 0) {
        console.log('[ParseInPage] 前3条示例数据:')
        data.slice(0, 3).forEach((item, idx) => {
          console.log(`  ${idx + 1}. name: "${String(item.name || '').substring(0, 50)}"`)
          console.log(`     url: "${String(item.url || '').substring(0, 100)}"`)
          if (item.author) console.log(`     author: "${String(item.author).substring(0, 30)}"`)
        })
      }
    } else {
      console.log(`[ParseInPage] ❌ 解析失败: ${results.error}`)
    }
    console.log('='.repeat(50))

    if (!results.success) {
      return { success: false, error: results.error || '解析失败' }
    }

    return { success: true, data: results.data as unknown[] }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ParseInPage] Error:', message)
    return { success: false, error: message }
  } finally {
    if (page) {
      await page.close().catch(() => {})
    }
  }
}

/**
 * 代理获取图片（绕过防盗链）
 */
async function handleProxyImage(request: {
  url: string
  referer?: string
}): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  const { url, referer } = request

  if (!url) {
    return { success: false, error: 'URL is required' }
  }

  try {
    // 从 URL 中提取 host 作为 referer
    const urlObj = new URL(url)
    let effectiveReferer = referer

    // 针对特定 CDN 设置正确的 Referer
    if (!effectiveReferer) {
      const host = urlObj.host.toLowerCase()
      if (host.includes('acimg.cn') || host.includes('ac.qq.com')) {
        // 腾讯漫画 CDN 需要使用 ac.qq.com 作为 Referer
        effectiveReferer = 'https://ac.qq.com/'
      } else {
        effectiveReferer = `${urlObj.protocol}//${urlObj.host}/`
      }
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: effectiveReferer,
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    return { success: true, dataUrl }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ProxyImage] Error:', message)
    return { success: false, error: message }
  }
}

/**
 * 注册 IPC 处理器
 */
export function registerProxyHandlers(): void {
  ipcMain.handle('proxy:fetch', async (_, request: ProxyRequest) => {
    return handleProxy(request)
  })

  ipcMain.handle('proxy:parse', (_, request: ParseRequest) => {
    return handleParse(request)
  })

  ipcMain.handle('proxy:parseInPage', async (_, request: ParseInPageRequest) => {
    return handleParseInPage(request)
  })

  ipcMain.handle('proxy:executeJs', async (_, request: ExecuteJsRequest) => {
    return handleExecuteJs(request)
  })

  ipcMain.handle('proxy:image', async (_, request: { url: string; referer?: string }) => {
    return handleProxyImage(request)
  })
}

/**
 * 清理浏览器实例
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    console.log('Closing browser...')
    await browser.close().catch(() => {})
    browser = null
  }
}
