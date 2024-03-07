"use strict";

const { resolve, join, parse } = require('path')
const { readdirSync, lstatSync, statSync, copyFileSync } = require('fs')
const parseArgs = require('./utils/parseArgs')
const mkdirWhenNotExist = require('./utils/mkdirWhenNotExist')
const args = parseArgs({
  define: {
    version: '0.0.2',
    description: '深度遍历文件夹并输出符合条件的文件',
  },
  f: {
    alias: 'folder',
    type: 'str',
    help: '目标文件夹',
		symbol: 'folder',
  },
  o: {
    alias: 'output',
    type: 'str',
    help: '输出路径',
    symbol: 'output',
  },
  d: {
    alias: 'date',
    type: 'str',
    help: '筛选出所有大于这个日期的文件（默认值为 现在）',
    default: Date.now(),
    symbol: 'date'
  }
})

/**
 * {
 *  path: str[]
 *  date: number
 * }
 */
function generateFileList (scheme) {
  const results = []
  const pathArr = scheme.path
  const dirpath = resolve(...pathArr)
  const files = readdirSync(dirpath)
  
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  files.sort(collator.compare)
  
  for (let i = 0, len = files.length; i < len; i++) {
    const target = files[i]
    const childPath = pathArr.concat(target)
    const resolvedPath = resolve(...childPath)
    const isDir = lstatSync(resolvedPath).isDirectory()

    if (isDir) {
      results.push(generateFileList({ path: childPath, date: null }))
    } else {
      const date = statSync(join(...childPath)).mtime.getTime()
      results.push({ path: childPath, date })
    }
  }

  return results.flat()
}

function print (schemes) {
  for (let i = 0, len = schemes.length; i < len; i++) {
    const { path, date } = schemes[i]
    console.log(`路径：${ resolve(...path) }`)
    console.log(`日期：${ new Date(date).toLocaleDateString() }`)
    console.log('')
  }
}

function copy (schemes, output) {
  for (let i = 0, len = schemes.length; i < len; i++) {
    const { path, date } = schemes[i]
    const resoucePath = resolve(...path)
    const targetPath = resolve(...[output].concat(path.slice(1)))
    const targetDirPath = parse(targetPath).dir
    mkdirWhenNotExist(targetDirPath)
    copyFileSync(resoucePath, targetPath)
    console.log(`输入路径：${ resoucePath }`)
    console.log(`输出路径：${ targetPath }`)
    console.log(`日期：${ new Date(date).toLocaleDateString() }`)
    console.log('')
  }
}

function computeDate (date) {
  const fullRegexp = /^\d{4}\-\d{2}\-\d{2}(\s+\d{2}\:\d{2}\:\d{2})?$/
  const partRegexp = /\d{2}\:\d{2}\:\d{2}$/
  if (!fullRegexp.test(date)) {
    console.log('错误：日期参数不符合格式 YYYY-MM-DD hh:mm:ss')
    process.exit()
  }
  if (date.match(partRegexp) === null) {
    date = date.trim() + ' 00:00:00'
  }
  return new Date(date).getTime()
}

function main ({ folder, output, date }) {
  const startTime = Date.now()
  const computedDate = computeDate(date)
  const fileList = generateFileList({ path: [folder], date: null })
    .filter(({ date: _date }) => typeof _date === 'number' && _date > computedDate)

  console.log(`已找到：${ fileList.length } 个文件`)
  console.log(`耗时：${ (Date.now() - startTime) / 1000 } 秒`)
  console.log('')
  if (output) {
    copy(fileList, output)
  } else {
    print(fileList)
  }
}

main(args)