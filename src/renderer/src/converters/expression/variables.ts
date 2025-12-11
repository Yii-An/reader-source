// 变量语法转换器
// 处理不同平台之间的变量语法差异

/**
 * 将 any-reader 变量转换为通用格式
 */
export function convertAnyReaderVariables(expr: string): string {
  if (!expr) return expr

  let result = expr

  // $host -> {{host}}
  result = result.replace(/\$host\b/g, '{{host}}')

  // $keyword -> {{keyword}}
  result = result.replace(/\$keyword\b/g, '{{keyword}}')

  // $page -> {{page}}
  result = result.replace(/\$page\b/g, '{{page}}')

  return result
}

/**
 * 将通用变量转换为 any-reader 格式
 */
export function convertToAnyReaderVariables(expr: string): string {
  if (!expr) return expr

  let result = expr

  // {{host}} -> $host
  result = result.replace(/\{\{host\}\}/g, '$host')

  // {{keyword}} -> {{keyword}} (保持不变)

  // {{page}} -> {{page}} (保持不变)

  return result
}

/**
 * 将 Legado 变量转换为通用格式
 */
export function convertLegadoVariables(expr: string): string {
  if (!expr) return expr

  let result = expr

  // {{key}} -> {{keyword}}
  result = result.replace(/\{\{key\}\}/g, '{{keyword}}')

  // {{baseUrl}} -> {{host}}
  result = result.replace(/\{\{baseUrl\}\}/g, '{{host}}')

  return result
}

/**
 * 将通用变量转换为 Legado 格式
 */
export function convertToLegadoVariables(expr: string): string {
  if (!expr) return expr

  let result = expr

  // {{keyword}} -> {{key}}
  result = result.replace(/\{\{keyword\}\}/g, '{{key}}')

  // {{host}} -> {{baseUrl}}
  result = result.replace(/\{\{host\}\}/g, '{{baseUrl}}')

  return result
}

/**
 * 处理列表反序标记
 */
export function handleReversePrefix(expr: string): { expr: string; reversed: boolean } {
  if (!expr) return { expr, reversed: false }

  const trimmed = expr.trim()

  // Legado 使用 - 前缀表示反序
  if (trimmed.startsWith('-')) {
    return {
      expr: trimmed.slice(1).trim(),
      reversed: true
    }
  }

  // 通用格式使用 @reverse 后缀
  if (trimmed.endsWith('@reverse')) {
    return {
      expr: trimmed.slice(0, -8).trim(),
      reversed: true
    }
  }

  return { expr, reversed: false }
}

/**
 * 添加反序标记
 */
export function addReversePrefix(expr: string, format: 'universal' | 'legado'): string {
  if (!expr) return expr

  if (format === 'legado') {
    return '-' + expr
  } else {
    return expr + '@reverse'
  }
}

/**
 * 处理 Legado 的 <js></js> 标签
 */
export function convertLegadoJsTag(expr: string): string {
  if (!expr) return expr

  // <js>code</js> -> @js:code
  const jsMatch = expr.match(/<js>([\s\S]*?)<\/js>/g)
  if (jsMatch) {
    let result = expr
    for (const match of jsMatch) {
      const code = match.slice(4, -5) // 移除 <js> 和 </js>
      result = result.replace(match, `@js:${code.trim()}`)
    }
    return result
  }

  return expr
}

/**
 * 将通用格式的 JS 表达式转换为 Legado 格式
 */
export function convertToLegadoJsTag(expr: string): string {
  if (!expr) return expr

  // 如果是纯 JS 表达式，转换为 <js></js> 格式
  if (expr.startsWith('@js:')) {
    const code = expr.slice(4)
    return `<js>${code}</js>`
  }

  return expr
}

/**
 * 综合转换：any-reader 表达式到通用格式
 */
export function normalizeAnyReaderExpression(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertAnyReaderVariables(result)

  // @filter: -> @regex:
  result = result.replace(/@filter:/g, '@regex:')

  return result
}

/**
 * 综合转换：Legado 表达式到通用格式
 */
export function normalizeLegadoExpression(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertLegadoVariables(result)

  // 转换 JS 标签
  result = convertLegadoJsTag(result)

  // @XPath: -> @xpath:
  result = result.replace(/@XPath:/g, '@xpath:')

  return result
}

/**
 * 综合转换：通用格式到 any-reader 表达式
 */
export function denormalizeToAnyReader(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertToAnyReaderVariables(result)

  // @regex: -> @filter:
  result = result.replace(/@regex:/g, '@filter:')

  return result
}

/**
 * 综合转换：通用格式到 Legado 表达式
 */
export function denormalizeToLegado(expr: string): string {
  if (!expr) return expr

  let result = expr

  // 转换变量
  result = convertToLegadoVariables(result)

  return result
}
