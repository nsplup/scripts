"use strict";

const { resolve, join, parse } = require('path')
const { readdirSync, lstatSync, writeFileSync, appendFileSync, readFileSync } = require('fs')
const parseArgs = require('./utils/parseArgs')
const mkdirWhenNotExist = require('./utils/mkdirWhenNotExist')
const args = parseArgs({
  define: {
    version: '0.0.1',
    description: '深度遍历文件夹并打包输出符合条件的法条文档',
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
})


const INCLUDE_DIR = [
  '案例',
  '部门规章',
  '经济法',
  '民法典',
  '民法商法',
  '其他',
  '社会法',
  '司法解释',
  '诉讼与非诉讼程序法',
  '宪法',
  '宪法相关法',
  '刑法',
  // '行政法',
  // '行政法规',
]
const EXCLUDE_FILES = [
  '_index.md',
  'README.md',
  '法律法规模版.md'
]

function generateFileList ({ paths }) {
  const results = []
  const dirpath = resolve(...paths)
  const files = readdirSync(dirpath)
  
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  files.sort(collator.compare)
  
  for (let i = 0, len = files.length; i < len; i++) {
    const target = files[i]
    const childPath = paths.concat(target)
    const resolvedPath = resolve(...childPath)
    const isDir = lstatSync(resolvedPath).isDirectory()

    if (isDir) {
      if (INCLUDE_DIR.includes(childPath[1])) {
        results.push(generateFileList({ paths: childPath }))
      }
    } else {
      if (target.endsWith('.md') && !EXCLUDE_FILES.includes(target)) {
        results.push({ paths: childPath })
      }
    }
  }

  return results.flat()
}



function merge (fileList, output) {
  const outputPath = resolve(output)
  const outputDir = parse(outputPath).dir

  mkdirWhenNotExist(outputDir)
  writeFileSync(outputPath, '', { encoding: 'utf8' })
  for (let i = 0, len = fileList.length; i < len; i++) {
    const filePath = fileList[i].paths
    let content = readFileSync(resolve(...filePath), { encoding: 'utf8' })

    content = `\n\n${ content.replace('<!-- INFO END -->', '') }`
    appendFileSync(outputPath, content, { encoding: 'utf8' })
  }
}

function main ({ folder, output }) {
  const fileList = generateFileList({ paths: [folder] })

  merge(fileList, output)
}

main(args)