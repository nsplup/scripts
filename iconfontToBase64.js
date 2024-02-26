"use strict";

const fs = require('fs')
const path = require('path')
const { ArgumentParser } = require('argparse')

const version = '0.0.1'
const parser = new ArgumentParser({
  description: '将字体文件转换为 BASE64 后嵌入样式文件'
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-i', '--input', { type: 'str', help: '输入路径' })
parser.add_argument('-o', '--output', { type: 'str', help: '输出路径', default: './' })

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

const args = parser.parse_args()
main(args)