"use strict";

const fs = require('fs')
const path = require('path')
const parseArgs = require('./utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.1',
    description: '将字体文件转换为 BASE64 后嵌入样式文件',
  },
  i: {
    alias: 'input',
    type: 'str',
    help: '输入路径',
    symbol: 'input',
  },
  o: {
    alias: 'output',
    type: 'str',
    help: '输出路径（默认值为 当前环境目录）',
    default: './',
    symbol: 'output',
  }
})

function main ({ input, output }) {
  if (!input) {
    console.log('致命错误 - 输入路径不能为空')
    return
  }

  input = path.resolve(input)

  const REGEXP = /url\(["'](.+?)["']\)(\sformat\(["'](.+?)["']\))/gi
  const { dir: inputDIR, name, ext } = path.parse(input)
  const content = fs.readFileSync(input, { encoding: 'utf8' })
  const targets = Array.from(content.matchAll(REGEXP))
  const len = targets.length
  let newContent = content

  if (len === 0) {
    console.log('致命错误 - 找不到匹配字段')
    return
  }

  for (let i = 0; i < len; i++) {
    const [ignore, filePath, ignore2, fileType] = targets[i]

    try {
      const file = fs.readFileSync(path.resolve(inputDIR, filePath.split('?')[0]))
      const base64String = Buffer.from(file).toString('base64')
      const newURL = `data:font/${ fileType };charset=utf-8;base64,${base64String}`

      newContent = newContent.replace(filePath, newURL)
    } catch (e) {
      console.log(e)
    }
  }

  output = path.resolve(output, name + '_new' + ext)
  fs.writeFileSync(output, newContent, { encoding: 'utf8' })

  console.log(`输出路径：${ output }`)
}

main(args)