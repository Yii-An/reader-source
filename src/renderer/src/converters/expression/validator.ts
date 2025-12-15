/**
 * 表达式验证器
 * 用于检查表达式语法正确性和提供错误提示
 */

import { detectExpressionType, ExpressionType } from '../../types/expression'
import { VariableConverter } from './variables'

/**
 * 验证错误
 */
export interface ValidationError {
  type: 'syntax' | 'variable' | 'type' | 'bracket'
  message: string
  position?: { start: number; end: number }
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  type: 'deprecated' | 'performance' | 'compatibility'
  message: string
}

/**
 * 验证结果
 */
export interface ExpressionValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  expressionType: ExpressionType
}

/**
 * 表达式验证器类
 */
export class ExpressionValidator {
  /**
   * 验证表达式
   * @param expr 表达式字符串
   * @returns 验证结果
   */
  static validate(expr: string): ExpressionValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const expressionType = detectExpressionType(expr)

    if (!expr || typeof expr !== 'string') {
      return { valid: true, errors, warnings, expressionType: 'literal' }
    }

    // 1. 检查括号匹配
    const bracketError = this.checkBrackets(expr)
    if (bracketError) {
      errors.push(bracketError)
    }

    // 2. 检查变量有效性
    const varResult = VariableConverter.validateVariables(expr)
    if (!varResult.valid) {
      warnings.push({
        type: 'compatibility',
        message: `未知变量: ${varResult.unknownVariables.join(', ')}`
      })
    }

    // 3. 类型特定验证
    const typeErrors = this.validateByType(expr, expressionType)
    errors.push(...typeErrors)

    // 4. 检查废弃语法
    const deprecationWarnings = this.checkDeprecated(expr)
    warnings.push(...deprecationWarnings)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      expressionType
    }
  }

  /**
   * 检查括号匹配
   */
  private static checkBrackets(expr: string): ValidationError | null {
    const stack: { char: string; pos: number }[] = []
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}'
    }
    const closingChars = Object.values(pairs)

    let inString = false
    let stringChar = ''

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i]
      const prevChar = expr[i - 1]

      // 处理字符串
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
        }
        continue
      }

      // 在字符串内部跳过括号检查
      if (inString) continue

      if (char in pairs) {
        stack.push({ char, pos: i })
      } else if (closingChars.includes(char)) {
        const last = stack.pop()
        if (!last || pairs[last.char] !== char) {
          return {
            type: 'bracket',
            message: `括号不匹配: 位置 ${i} 的 '${char}'`,
            position: { start: i, end: i + 1 }
          }
        }
      }
    }

    if (stack.length > 0) {
      const unclosed = stack[0]
      return {
        type: 'bracket',
        message: `未闭合的括号: 位置 ${unclosed.pos} 的 '${unclosed.char}'`,
        position: { start: unclosed.pos, end: unclosed.pos + 1 }
      }
    }

    return null
  }

  /**
   * 按类型验证
   */
  private static validateByType(expr: string, type: ExpressionType): ValidationError[] {
    const errors: ValidationError[] = []

    switch (type) {
      case 'css':
        errors.push(...this.validateCss(expr))
        break
      case 'xpath':
        errors.push(...this.validateXPath(expr))
        break
      case 'json':
        errors.push(...this.validateJsonPath(expr))
        break
      case 'js':
        errors.push(...this.validateJs(expr))
        break
      case 'regex':
        errors.push(...this.validateRegex(expr))
        break
    }

    return errors
  }

  /**
   * 验证 CSS 选择器
   */
  private static validateCss(expr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const content = expr.replace(/^@css:/, '')

    // 检查常见错误
    if (content.includes('//')) {
      errors.push({
        type: 'syntax',
        message: 'CSS 选择器不应包含 "//"，这是 XPath 语法'
      })
    }

    // 检查空选择器
    if (!content.trim()) {
      errors.push({
        type: 'syntax',
        message: 'CSS 选择器不能为空'
      })
    }

    return errors
  }

  /**
   * 验证 XPath
   */
  private static validateXPath(expr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const content = expr.replace(/^@xpath:/, '').replace(/^@XPath:/, '')

    // 检查基本语法
    if (content.trim() && !content.startsWith('/') && !content.startsWith('(')) {
      errors.push({
        type: 'syntax',
        message: 'XPath 应以 "/" 或 "(" 开头'
      })
    }

    // 检查空表达式
    if (!content.trim()) {
      errors.push({
        type: 'syntax',
        message: 'XPath 表达式不能为空'
      })
    }

    return errors
  }

  /**
   * 验证 JSONPath
   */
  private static validateJsonPath(expr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const content = expr.replace(/^@json:/, '')

    if (content.trim() && !content.startsWith('$')) {
      errors.push({
        type: 'syntax',
        message: 'JSONPath 应以 "$" 开头'
      })
    }

    // 检查空表达式
    if (!content.trim()) {
      errors.push({
        type: 'syntax',
        message: 'JSONPath 表达式不能为空'
      })
    }

    return errors
  }

  /**
   * 验证 JavaScript
   */
  private static validateJs(expr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const content = expr.replace(/^@js:/, '').replace(/<js>([\s\S]*?)<\/js>/, '$1')

    // 基本语法检查（不执行）
    if (content.trim()) {
      try {
        // 使用 Function 构造函数检查语法
        new Function(content)
      } catch (e) {
        errors.push({
          type: 'syntax',
          message: `JavaScript 语法错误: ${(e as Error).message}`
        })
      }
    }

    return errors
  }

  /**
   * 验证正则表达式
   */
  private static validateRegex(expr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const content = expr.replace(/^@regex:/, '').replace(/^@filter:/, '')

    if (content.trim()) {
      try {
        new RegExp(content)
      } catch (e) {
        errors.push({
          type: 'syntax',
          message: `正则表达式语法错误: ${(e as Error).message}`
        })
      }
    }

    return errors
  }

  /**
   * 检查废弃语法
   */
  private static checkDeprecated(expr: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    if (expr.includes('@XPath:')) {
      warnings.push({
        type: 'deprecated',
        message: '建议使用小写 @xpath: 替代 @XPath:'
      })
    }

    if (expr.includes('@filter:')) {
      warnings.push({
        type: 'deprecated',
        message: '建议使用 @regex: 替代 @filter:'
      })
    }

    if (expr.includes('<js>')) {
      warnings.push({
        type: 'deprecated',
        message: '建议使用 @js: 替代 <js></js> 标签'
      })
    }

    return warnings
  }

  /**
   * 快速检查表达式是否有效
   * @param expr 表达式
   * @returns 是否有效
   */
  static isValid(expr: string): boolean {
    const result = this.validate(expr)
    return result.valid
  }

  /**
   * 获取表达式类型
   * @param expr 表达式
   * @returns 表达式类型
   */
  static getType(expr: string): ExpressionType {
    return detectExpressionType(expr)
  }

  /**
   * 格式化验证结果为可读字符串
   * @param result 验证结果
   * @returns 格式化的字符串
   */
  static formatResult(result: ExpressionValidationResult): string {
    const lines: string[] = []

    if (result.valid) {
      lines.push(`✓ 表达式有效 (类型: ${result.expressionType})`)
    } else {
      lines.push(`✗ 表达式无效 (类型: ${result.expressionType})`)
    }

    if (result.errors.length > 0) {
      lines.push('错误:')
      for (const err of result.errors) {
        const pos = err.position ? ` [位置: ${err.position.start}]` : ''
        lines.push(`  - [${err.type}] ${err.message}${pos}`)
      }
    }

    if (result.warnings.length > 0) {
      lines.push('警告:')
      for (const warn of result.warnings) {
        lines.push(`  - [${warn.type}] ${warn.message}`)
      }
    }

    return lines.join('\n')
  }
}
