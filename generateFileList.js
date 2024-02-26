"use strict";

const { resolve, basename } = require('path')
const { readdirSync, lstatSync, writeFileSync } = require('fs')
const { ArgumentParser } = require('argparse')

const version = '0.0.1'
const parser = new ArgumentParser({
  description: '深度遍历文件夹并输出文件夹结构'
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-f', '--folder', { type: 'str', help: '输入文件夹' })
parser.add_argument('-o', '--output', { type: 'str', help: '（可选的）输出路径' })

function generateFileList (dirpath, depth = 0) {
  const results = []
  const files = readdirSync(resolve(dirpath))
  
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  files.sort(collator.compare)
  
  for (let i = 0, len = files.length; i < len; i++) {
    const target = files[i]
    const resolvedPath = resolve(dirpath, target)
    const isDir = lstatSync(resolvedPath).isDirectory()

    results.push('　'.repeat(depth) + target)
    if (isDir) {
      results.push(generateFileList(resolvedPath, depth + 1))
    }
  }

  return results.join('\n')
}

function main ({ folder: input, output }) {
  const fileList = generateFileList(input)

  if (output) {
    const resolvedPath = resolve(resolve(output), basename(input) + '.txt')

    writeFileSync(resolvedPath, fileList, { encoding: 'utf8' })
    console.log(`输出目标：${resolvedPath}`)
  } else {
    console.log(fileList)
  }
}

const args = parser.parse_args()
main(args)