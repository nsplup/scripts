"use strict";

const { readdirSync, renameSync } = require('fs')
const path = require('path')
const { toArabic: r2a } = require('roman-numerals')
const parseArgs = require('./utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.3',
    description: '遍历文件夹重命名文件夹内所有子目录',
  },
  f: {
    alias: 'folder',
    type: 'str',
    help: '目标文件夹',
    symbol: 'folder',
  },
  p: {
    alias: 'pattern',
    type: 'str',
    help: '命名模板（默认值为"Vol.${PAD=2;START=1}"）\n参数：[PAD 指定总长度，不足则向前填充零][START 指定初始值]\n使用单引号传值',
    symbol: 'pattern',
    default: 'Vol.${PAD=2;START=1}'
  },
  m: {
    alias: 'mode',
    type: 'str',
    help: '增量值模式（默认值为 ORDER）\n可选值：[ORDER][T:ROMAN][T:CHINA][T:ARABIC]',
    symbol: 'mode',
    default: 'order'
  },
  'R': {
    alias: 'roman',
    type: 'bool',
    help: '针对非统一码罗马数字进行排序（默认值为 true）',
    symbol: 'roman',
    default: true
  },
  'D': {
    alias: 'dry-run',
    type: 'bool',
    help: '以空运行模式运行（默认值为 false）',
    default: false
  }
})

const RN_REG = /\b[IVXLCDM]+\b/gi
const P_REG = /\$\{[^\}]*\}/gi
const MODES = {
  'ORDER': toPattern,
  'T:ROMAN': toRoman,
  'T:CHINA': toChina,
  'T:ARABIC':toArabic,
}

function main ({ folder, pattern, R, D, mode }) {
  if (typeof pattern !== 'string') {
    throw new TypeError('非法的命名模板参数')
  }

  const matched = pattern.match(P_REG)
  if (pattern.length === 0) {
    pattern = '${}'
  } else if (matched === null) {
    pattern += '_${}'
  }

  if (typeof mode === 'string') {
    mode = mode.toLocaleUpperCase()
  }
  if (!Object.keys(MODES).includes(mode)) {
    throw new TypeError('非法的增量值模式参数')
  }

  if (typeof folder === 'string' && folder.length > 0) {
    rename(folder, pattern, R, D, mode)
  } else {
    throw new TypeError('非法的目标文件夹路径')
  }
}

function isValidRoman(str) {
  return /^M*(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(str)
}

function convertFullWidthRomanToHalfWidth(str) {
  // 创建全角到半角的映射表
  const fullToHalfMap = {
      '\uFF29': 'I', // 全角I
      '\uFF36': 'V', // 全角V
      '\uFF38': 'X', // 全角X
      '\uFF2C': 'L', // 全角L
      '\uFF23': 'C', // 全角C
      '\uFF24': 'D', // 全角D
      '\uFF2D': 'M'  // 全角M
  }
  // 构建正则表达式，匹配所有需要转换的字符
  const regex = new RegExp(`[${Object.keys(fullToHalfMap).join('')}]`, 'g')
  // 替换匹配到的全角字符为半角
  return str.replace(regex, (match) => fullToHalfMap[match])
}

function getRoman (str) {
  let result = convertFullWidthRomanToHalfWidth(str).match(RN_REG)

  if (result !== null) {
    result = result[0].toLocaleUpperCase()
  }
  
  return isValidRoman(result) ?
    r2a(result) :
    null
}

function replaceRoman (str) {
  return convertFullWidthRomanToHalfWidth(str)
    .replace(RN_REG, fragment => {
      let roman = fragment.toLocaleUpperCase()

      return isValidRoman(roman) ?
        r2a(roman) :
        fragment
    })
}

function parsePattern (pattern) {
  let pStr = null
  const matched = pattern.match(P_REG)

  if (matched !== null) {
    pStr = matched[0]
      .slice(2, -1)
      .toLocaleLowerCase()
  }

  const result = pStr.split(';').reduce((prev, current) => {
    let [key, val] = current.split('=')

    val = parseInt(val)

    if (!isNaN(val)) {
      prev[key] = val
    }

    return prev
  }, {})

  return Object.assign({
    pad: 2,
    start: 1,
  }, result)
}

function toPattern ({ increment, pattern, notOrder }) {
  let { pad, start } = parsePattern(pattern)

  if (notOrder) { start = 0 } /** 非 ORDER 模式时该参数不生效 */

  return pattern.replace(P_REG, fragment => {
    return (increment + start).toString().padStart(pad, '0')
  })
}

function toRoman ({ title, pattern }) {
  return toPattern({
    increment: getRoman(title),
    pattern,
    notOrder: true,
  })
}

function toChina ({ title, pattern }) {
  console.log('\x1B[40m%s\x1B[0m', '该模式正在开发中')
  process.exit(1)
  return toPattern({
    increment: getRoman(title),
    pattern,
    notOrder: true,
  })
}

function toArabic ({title, pattern}) {
  console.log('\x1B[40m%s\x1B[0m', '该模式正在开发中')
  process.exit(1)
  return toPattern({
    increment: getRoman(title),
    pattern,
    notOrder: true,
  })
}

function rename (dirPath, pattern, R, D, mode) {
  const dirs = readdirSync(dirPath)
  const failed = []
  
  /** 按照文件名排序 */
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  if (R) {
    dirs.sort((a, b) => collator.compare(replaceRoman(a), replaceRoman(b)))
  } else {
    dirs.sort(collator.compare)
  }

  for (let i = 0, len = dirs.length; i < len; i++) {
    const dir = dirs[i]
    const oldName = path.resolve(dirPath, dir)
    try {
      let newName = MODES[mode].call(MODES, { increment: i, title: dir, pattern })

      newName = path.resolve(dirPath, newName)
      if (oldName !== newName) {
        console.log(`原目录名：${oldName}`)
        console.log(`新目录名：${newName}\n`)
        !D && renameSync(oldName, newName)
      }
    } catch (e) {
      failed.push(oldName)
    }
  }
  
  if (failed.length > 0) {
    console.log('\n处理失败项：')
    console.log(failed.map(n => ' '.repeat(4) + n).join('\n'))
  }

  D && console.log('\x1B[40m%s\x1B[0m', '当前为空运行模式，不会有任何变更生效')
}

main(args)