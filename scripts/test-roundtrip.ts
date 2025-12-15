/**
 * 规则转换往返测试
 * 测试导入 → 通用格式 → 导出的一致性
 */

import { anyReaderConverter } from '../src/renderer/src/converters/any-reader'
import { legadoConverter } from '../src/renderer/src/converters/legado'
import * as fs from 'fs'
import * as path from 'path'

// 测试结果类型
interface TestResult {
  platform: string
  passed: boolean
  differences: FieldDiff[]
  warnings: string[]
}

interface FieldDiff {
  field: string
  original: unknown
  roundtrip: unknown
}

// 需要忽略的字段（元数据、时间戳、或暂未实现转换的字段）
const IGNORED_FIELDS = [
  '_meta',
  'createTime',
  'modifiedTime',
  'lastUpdateTime',
  // 可能因为转换而变化的字段
  'id',
  'bookSourceUrl',
  // 暂未实现转换的字段
  'customButton',
  'eventListener',
  'enableMultiRoads',
  'chapterRoads',
  'chapterRoadName',
  // 布尔值 false 可能不需要保持
  'enabled',
  'enabledExplore',
  'enabledCookieJar'
]

// 需要特殊处理的字段（如类型转换）
const TRANSFORM_FIELDS = new Map<string, (val: unknown) => unknown>([
  // contentType 数字 ↔ 字符串转换
  ['contentType', (val) => (typeof val === 'number' ? val : undefined)],
  ['bookSourceType', (val) => (typeof val === 'number' ? val : undefined)]
])

/**
 * 深度比较两个对象
 */
function deepCompare(
  original: Record<string, unknown>,
  roundtrip: Record<string, unknown>,
  path: string = ''
): FieldDiff[] {
  const diffs: FieldDiff[] = []

  // 获取所有键
  const allKeys = new Set([...Object.keys(original), ...Object.keys(roundtrip)])

  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key

    // 跳过忽略的字段
    if (IGNORED_FIELDS.some((ignored) => fullPath.startsWith(ignored) || key === ignored)) {
      continue
    }

    let origVal = original[key]
    let rtVal = roundtrip[key]

    // 特殊转换处理
    if (TRANSFORM_FIELDS.has(key)) {
      const transform = TRANSFORM_FIELDS.get(key)!
      origVal = transform(origVal)
      rtVal = transform(rtVal)
    }

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
 * 测试 any-reader 规则往返转换
 */
function testAnyReaderRoundtrip(original: Record<string, unknown>): TestResult {
  const warnings: string[] = []

  try {
    // 1. 转换为通用格式
    const universal = anyReaderConverter.toUniversal(original as any)

    // 2. 转换回 any-reader 格式
    const roundtrip = anyReaderConverter.fromUniversal(universal)

    // 3. 比较差异
    const differences = deepCompare(original, roundtrip as Record<string, unknown>)

    return {
      platform: 'any-reader',
      passed: differences.length === 0,
      differences,
      warnings
    }
  } catch (error) {
    return {
      platform: 'any-reader',
      passed: false,
      differences: [],
      warnings: [`转换失败: ${error}`]
    }
  }
}

/**
 * 测试 Legado 规则往返转换
 */
function testLegadoRoundtrip(original: Record<string, unknown>): TestResult {
  const warnings: string[] = []

  try {
    // 1. 转换为通用格式
    const universal = legadoConverter.toUniversal(original as any)

    // 2. 转换回 Legado 格式
    const roundtrip = legadoConverter.fromUniversal(universal)

    // 3. 比较差异
    const differences = deepCompare(original, roundtrip as Record<string, unknown>)

    return {
      platform: 'legado',
      passed: differences.length === 0,
      differences,
      warnings
    }
  } catch (error) {
    return {
      platform: 'legado',
      passed: false,
      differences: [],
      warnings: [`转换失败: ${error}`]
    }
  }
}

/**
 * 格式化输出差异
 */
function formatDiff(diff: FieldDiff): string {
  const origStr = JSON.stringify(diff.original, null, 2)?.substring(0, 100)
  const rtStr = JSON.stringify(diff.roundtrip, null, 2)?.substring(0, 100)
  return `  - ${diff.field}:\n    原始: ${origStr}\n    往返: ${rtStr}`
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🧪 规则转换往返测试\n')
  console.log('='.repeat(60))

  const testDir = path.join(__dirname, '../test_rules')
  let allPassed = true

  // 测试 any-reader
  const anyReaderPath = path.join(testDir, 'any-reader.json')
  if (fs.existsSync(anyReaderPath)) {
    console.log('\n📦 测试 any-reader 规则...')
    const anyReaderRule = JSON.parse(fs.readFileSync(anyReaderPath, 'utf-8'))
    const result = testAnyReaderRoundtrip(anyReaderRule)

    if (result.passed) {
      console.log('  ✅ 往返转换一致')
    } else {
      allPassed = false
      console.log('  ❌ 发现差异:')
      result.differences.forEach((diff) => console.log(formatDiff(diff)))
    }

    if (result.warnings.length > 0) {
      console.log('  ⚠️ 警告:')
      result.warnings.forEach((w) => console.log(`    ${w}`))
    }
  }

  // 测试 Legado
  const legadoPath = path.join(testDir, 'Legado.json')
  if (fs.existsSync(legadoPath)) {
    console.log('\n📦 测试 Legado 规则...')
    const legadoRule = JSON.parse(fs.readFileSync(legadoPath, 'utf-8'))
    const result = testLegadoRoundtrip(legadoRule)

    if (result.passed) {
      console.log('  ✅ 往返转换一致')
    } else {
      allPassed = false
      console.log('  ❌ 发现差异:')
      result.differences.forEach((diff) => console.log(formatDiff(diff)))
    }

    if (result.warnings.length > 0) {
      console.log('  ⚠️ 警告:')
      result.warnings.forEach((w) => console.log(`    ${w}`))
    }
  }

  console.log('\n' + '='.repeat(60))
  if (allPassed) {
    console.log('🎉 所有测试通过!')
  } else {
    console.log('❌ 有测试失败，请检查上述差异')
    process.exit(1)
  }
}

runTests().catch(console.error)
