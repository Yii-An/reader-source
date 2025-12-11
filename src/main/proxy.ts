import { ipcMain } from 'electron'
import * as cheerio from 'cheerio'
import puppeteer, { Browser, Page } from 'puppeteer'

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
 * 解析 HTML 内容
 */
function handleParse(request: ParseRequest): ParseResponse {
  const { html, listRule, contentRule, fields, host } = request

  if (!html) {
    return { success: false, error: 'HTML is required' }
  }

  try {
    const $ = cheerio.load(html)

    if (contentRule) {
      const content: string[] = []
      const selector = contentRule.replace(/@.*$/, '').trim()
      $(selector).each((_, el) => {
        const text = $(el).text().trim()
        if (text) content.push(text)
      })
      return { success: true, data: content }
    }

    if (listRule && fields) {
      const results: Record<string, unknown>[] = []
      const selector = listRule.replace(/@.*$/, '').trim()

      $(selector).each((_, element) => {
        const item: Record<string, unknown> = {}
        const $el = $(element)

        for (const [key, rule] of Object.entries(fields)) {
          if (!rule) continue
          item[key] = extractValue($el, rule, host)
        }

        if (item.name || item.url) {
          results.push(item)
        }
      })

      return { success: true, data: results }
    }

    return { success: false, error: 'Invalid parse request' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractValue($context: any, rule: string, host?: string): string {
  const atIndex = rule.lastIndexOf('@')
  let selector = ''
  let attr = 'text'

  if (rule.startsWith('@')) {
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

  if ((attr === 'href' || attr === 'src') && value && host && !value.startsWith('http')) {
    const baseHost = host.endsWith('/') ? host.slice(0, -1) : host
    value = value.startsWith('/') ? baseHost + value : baseHost + '/' + value
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
        const result = params.html
        try {
          // 使用 eval，它会返回最后一个表达式的值
          // eslint-disable-next-line no-eval
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
    const defaultReferer = `${urlObj.protocol}//${urlObj.host}/`

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: referer || defaultReferer,
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
