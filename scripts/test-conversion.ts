/**
 * 规则转换测试脚本
 * 自动扫描 test_rules 目录，执行往返转换测试
 * 运行: npx tsx scripts/test-conversion.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { anyReaderConverter } from '../src/renderer/src/converters/any-reader'
import { legadoConverter } from '../src/renderer/src/converters/legado'
import type { Rule } from '../src/renderer/src/types'
import type { LegadoRule } from '../src/renderer/src/types/legado'
import type { UniversalRule } from '../src/renderer/src/types/universal'

// ============================================================
// 配置
// ============================================================

const TEST_RULES_DIR = path.join(__dirname, '../test_rules')
const TMP_DIR = path.join(__dirname, '../tmp')

// 支持的规则目录配置
interface RuleDirConfig {
  dir: string
  converter: {
    toUniversal: (rule: Rule | LegadoRule) => UniversalRule
    fromUniversal: (rule: UniversalRule) => Rule | LegadoRule
    detect: (rule: unknown) => boolean
  }
}

const RULE_DIRS: Record<string, RuleDirConfig> = {
  anyReader: {
    dir: 'anyReader',
    converter: anyReaderConverter as unknown as RuleDirConfig['converter']
  },
  legado: {
    dir: 'legado',
    converter: legadoConverter as unknown as RuleDirConfig['converter']
  }
}

// 需要忽略的字段（元数据、时间戳、或暂未实现转换的字段）
const IGNORED_FIELDS = [
  '_meta',
  '_fieldSources',
  'createTime',
  'modifiedTime',
  'lastUpdateTime',
  // 可能因为转换而变化的字段
  'id',
  'bookSourceUrl',
  //暂未实现转换的字段
  'customButton',
  'eventListener',
  'enableMultiRoads',
  'chapterRoads',
  'chapterRoadName',
  // 布尔值 false 可能不需要保持
  'enabled',
  'enabledExplore',
  'enabledCookieJar',
  'enableUpload'
]

// ============================================================
// 类型定义
// ============================================================

interface FieldDiff {
  field: string
  original: unknown
  roundtrip: unknown
}

interface TestResult {
  platform: string
  ruleName: string
  passed: boolean
  differences: FieldDiff[]
  warnings: string[]
  files: {
    original: string
    universal: string
    roundtrip: string
  }
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 确保目录存在
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 清理并创建 tmp 目录
 */
function ensureTmpDir(): void {
  // 清理旧的 tmp 目录
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true })
  }
  // 创建新的 tmp 目录
  ensureDir(TMP_DIR)
}

/**
 * 深度比较两个对象
 */
function deepCompare(
  original: Record<string, unknown>,
  roundtrip: Record<string, unknown>,
  currentPath: string = ''
): FieldDiff[] {
  const diffs: FieldDiff[] = []

  // 获取所有键
  const allKeys = new Set([...Object.keys(original), ...Object.keys(roundtrip)])

  for (const key of allKeys) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key

    //跳过忽略的字段
    if (IGNORED_FIELDS.some((ignored) => fullPath.startsWith(ignored) || key === ignored)) {
      continue
    }

    let origVal = original[key]
    let rtVal = roundtrip[key]

    // 空值统一处理
    if (origVal === undefined || origVal === null || origVal === '') {
      origVal = undefined
    }
    if (rtVal === undefined || rtVal === null || rtVal === '') {
      rtVal = undefined
    }

    // 都为空则跳过
    if (origVal === undefined && rtVal === undefined) {
      continue
    }

    // 类型检查
    if (typeof origVal !== typeof rtVal) {
      // 特殊处理：数字和字符串的转换
      if (
        (typeof origVal === 'number' && typeof rtVal === 'string') ||
        (typeof origVal === 'string' && typeof rtVal === 'number')
      ) {
        if (String(origVal) === String(rtVal)) {
          continue
        }
      }
      diffs.push({ field: fullPath, original: origVal, roundtrip: rtVal })
      continue
    }

    // 对象递归比较
    if (typeof origVal === 'object' && origVal !== null) {
      if (Array.isArray(origVal) && Array.isArray(rtVal)) {
        // 数组比较
        if (JSON.stringify(origVal) !== JSON.stringify(rtVal)) {
          diffs.push({ field: fullPath, original: origVal, roundtrip: rtVal })
        }
      } else {
        // 对象递归
        const nestedDiffs = deepCompare(
          origVal as Record<string, unknown>,
          (rtVal || {}) as Record<string, unknown>,
          fullPath
        )
        diffs.push(...nestedDiffs)
      }
    } else {
      // 原始值比较
      if (origVal !== rtVal) {
        diffs.push({ field: fullPath, original: origVal, roundtrip: rtVal })
      }
    }
  }

  return diffs
}

/**
 * 格式化输出差异
 */
function formatDiff(diff: FieldDiff): string {
  const origStr = JSON.stringify(diff.original, null, 2)?.substring(0, 100)
  const rtStr = JSON.stringify(diff.roundtrip, null, 2)?.substring(0, 100)
  return `    - ${diff.field}:\n      原始: ${origStr}\n      往返: ${rtStr}`
}

// ============================================================
// 核心处理逻辑
// ============================================================

/**
 * 处理单个规则文件
 */
function processRuleFile(
  platform: string,
  config: RuleDirConfig,
  filePath: string,
  targetDir: string
): TestResult {
  const ruleName = path.basename(filePath, '.json')
  const warnings: string[] = []

  try {
    // 读取原始规则
    const originalContent = fs.readFileSync(filePath, 'utf-8')
    const original = JSON.parse(originalContent)

    // 验证规则格式
    if (!config.converter.detect(original)) {
      warnings.push(`规则格式检测失败，可能不是有效的 ${platform} 规则`)
    }

    // 转换为通用格式
    const universal = config.converter.toUniversal(original)

    // 转换回原格式
    const roundtrip = config.converter.fromUniversal(universal)

    // 保存中间文件
    const universalPath = path.join(targetDir, `${ruleName}_universal.json`)
    const roundtripPath = path.join(targetDir, `${ruleName}_roundtrip.json`)

    fs.writeFileSync(universalPath, JSON.stringify(universal, null, 2), 'utf-8')
    fs.writeFileSync(roundtripPath, JSON.stringify(roundtrip, null, 2), 'utf-8')

    // 比较差异
    const differences = deepCompare(
      original as Record<string, unknown>,
      roundtrip as Record<string, unknown>
    )

    return {
      platform,
      ruleName,
      passed: differences.length === 0,
      differences,
      warnings,
      files: {
        original: filePath,
        universal: universalPath,
        roundtrip: roundtripPath
      }
    }
  } catch (error) {
    return {
      platform,
      ruleName,
      passed: false,
      differences: [],
      warnings: [`处理失败: ${error instanceof Error ? error.message : String(error)}`],
      files: {
        original: filePath,
        universal: '',
        roundtrip: ''
      }
    }
  }
}

/**
 * 处理单个规则目录
 */
function processRuleDir(platform: string, config: RuleDirConfig): TestResult[] {
  const sourceDir = path.join(TEST_RULES_DIR, config.dir)
  const targetDir = path.join(TMP_DIR, config.dir)

  // 检查源目录是否存在
  if (!fs.existsSync(sourceDir)) {
    console.log(`  ⚠️  目录不存在: ${sourceDir}`)
    return []
  }

  // 创建目标目录
  ensureDir(targetDir)

  // 读取所有 JSON 文件
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.json'))

  if (files.length === 0) {
    console.log(`  ⚠️  目录为空: ${sourceDir}`)
    return []
  }

  const results: TestResult[] = []

  for (const file of files) {
    const filePath = path.join(sourceDir, file)
    const result = processRuleFile(platform, config, filePath, targetDir)
    results.push(result)
  }

  return results
}

// ============================================================
// 主程序
// ============================================================

async function main(): Promise<void> {
  console.log('\n🧪 规则转换测试\n')
  console.log('='.repeat(60))

  // 1. 清理/创建 tmp 目录
  ensureTmpDir()
  console.log(`\n📁 临时文件目录: ${TMP_DIR}\n`)

  // 2. 收集所有测试结果
  const allResults: TestResult[] = []

  // 3. 处理每个平台的规则
  for (const [platform, config] of Object.entries(RULE_DIRS)) {
    console.log(`\n📦 处理 ${platform} 规则...`)
    console.log('-'.repeat(40))

    const results = processRuleDir(platform, config)
    allResults.push(...results)

    // 输出每个规则的结果
    for (const result of results) {
      if (result.passed) {
        console.log(`  ✅ ${result.ruleName}`)
      } else {
        console.log(`  ❌ ${result.ruleName}`)
        if (result.differences.length > 0) {
          console.log('  差异:')
          result.differences.slice(0, 5).forEach((diff) => console.log(formatDiff(diff)))
          if (result.differences.length > 5) {
            console.log(`    ... 还有 ${result.differences.length - 5} 处差异`)
          }
        }
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => console.log(`⚠️  ${w}`))
      }

      // 输出生成的文件路径
      if (result.files.universal) {
        console.log(`    📄 Universal: ${path.relative(process.cwd(), result.files.universal)}`)
      }
      if (result.files.roundtrip) {
        console.log(`    📄 Roundtrip: ${path.relative(process.cwd(), result.files.roundtrip)}`)
      }
    }
  }

  // 4. 输出总结
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 测试总结\n')

  const passed = allResults.filter((r) => r.passed).length
  const failed = allResults.filter((r) => !r.passed).length
  const total = allResults.length

  console.log(`  通过: ${passed}`)
  console.log(`  失败: ${failed}`)
  console.log(`  总计: ${total}`)

  // 按平台统计
  const byPlatform = new Map<string, { passed: number; failed: number }>()
  for (const result of allResults) {
    const stats = byPlatform.get(result.platform) || { passed: 0, failed: 0 }
    if (result.passed) {
      stats.passed++
    } else {
      stats.failed++
    }
    byPlatform.set(result.platform, stats)
  }

  console.log('\n  按平台统计:')
  for (const [platform, stats] of byPlatform) {
    console.log(`    ${platform}: ${stats.passed}/${stats.passed + stats.failed}通过`)
  }

  console.log(`\n📁 中间文件已保存到: ${path.relative(process.cwd(), TMP_DIR)}/`)

  if (failed > 0) {
    console.log('\n❌ 有测试失败，请检查上述差异')
    process.exit(1)
  } else {
    console.log('\n🎉 所有测试通过!')
  }
}

// 运行主程序
main().catch((error) => {
  console.error('执行失败:', error)
  process.exit(1)
})
