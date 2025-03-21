const { parse, join, resolve } = require('path')
const { readFileSync, writeFileSync, readdirSync, renameSync, rmSync } = require('fs')
const { ArchiveReader, libarchiveWasm } = require('libarchive-wasm')
const { XMLParser } = require('fast-xml-parser')
const parseArgs = require('../utils/parseArgs')
const mkdirWhenNotExist = require('../utils/mkdirWhenNotExist')
const isNotNull = require('../utils/isNotNull')
const isPlainObject = require('../utils/isPlainObject')

const args = parseArgs({
  define: {
    version: '0.0.1',
    description: 'EPUB 文件提取工具',
  },
  i: {
    alias: 'input',
    type: 'str',
    help: '需要提取的 EPUB 文件路径',
    symbol: 'input',
  },
  f: {
    alias: 'folder',
    type: 'str',
    help: '包含需要提取的 EPUB 文件的文件夹路径',
    symbol: 'folder',
  },
  o: {
    alias: 'output',
    type: 'str',
    help: '输出文件夹路径',
    symbol: 'output',
  },
  d: {
    alias: 'detailed',
    type: 'bool',
    help: '是否输出详细日志（默认值为 false）',
    default: false
  }
})

const IMG_REGEXPS = [
  /<img\b[^>]*>/gi,
  /<image\b[^>]*>/gi,
]
const option = { attributeNamePrefix : '', ignoreAttributes: false }
const parser = new XMLParser(option)

function getIMGPath (xhtml) {
  const imgTag = IMG_REGEXPS
    .reduce((prev, current) => {
      return prev.concat(xhtml.match(current))
    }, [])
    .filter(n => n !== null)
  
  if (imgTag.length === 0) {
    throw new Error(`无法匹配标签：\n${ xhtml }`)
  }
  
  const node = parser.parse(imgTag[0])
  let result = null

  switch (true) {
    case isNotNull(node?.img?.src):
      result = parse(node.img.src).base
      break
    case isPlainObject(node.image) && node.image.hasOwnProperty('xlink:href'):
      result = parse(node.image['xlink:href']).base
      break
  }

  if (result === null) {
    throw new Error(`不受支持的标签类型：\n${ node }`)
  }

  return result
}

function finish (outputPath, detailed) {
  try {
    /** 从 container.xml 得到 rootfile 路径 */
    const containerXMLData = readFileSync(join(outputPath, 'container.xml'))
    const rootfilePath = parse(
      parser.parse(containerXMLData).container.rootfiles.rootfile['full-path']
    ).base
    /** 从 rootfile 读取 spine 列表及 manifest 映射表 */
    const rootfileData = readFileSync(join(outputPath, rootfilePath))
    const { spine, manifest } = parser.parse(rootfileData).package
    const manifestMap = manifest.item.reduce((prev, current) => {
      const { id, href } = current

      prev[id] = parse(href).base

      return prev
    }, {})
    const spineArr = spine.itemref.map(({ idref }) => manifestMap[idref])
    /** 根据 spine 列表建立图片顺序表 */
    const order = []
    for (let part of spineArr) {
      const partData = readFileSync(join(outputPath, part), { encoding: 'utf8' })
      order.push(getIMGPath(partData))
    }
    /** 重命名并删除多余文件 */
    const files = readdirSync(outputPath)
    let filesCount = 0

    console.log('正在收尾\n')
    for (let file of files) {
      const filePath = join(outputPath, file)
      const index = order.indexOf(file)
      const oldFile = parse(filePath)

      if (index < 0) {
        rmSync(filePath)
        detailed && console.log(`已删除：${ oldFile.base }`)
      } else {
        const newName = (index + 1).toString().padStart(order.length.toString().length, '0') + oldFile.ext

        filesCount += 1
        renameSync(filePath, join(outputPath, newName))
        if (detailed) {
          console.log(`重命名：`)
          console.log(`　　旧：${ oldFile.base }`)
          console.log(`　　新：${ newName }`)
        }
      }
    }
    console.log(`\n已完成：${ outputPath }`)
    if (filesCount === spineArr.length) {
      console.log(`\x1b[32m已通过完整性校验\x1b[0m\n`)
    } else {
      console.log(`\x1b[31m未通过完整性校验\x1b[0m\n`)
    }
  } catch (e) {
    throw e
  }
}

async function extract (input, output, detailed) {
  const file = parse(input)
  const filePath = resolve(input)
  const outputPath = join(output, file.name)

  try {
    const data = readFileSync(filePath)
    const mod = await libarchiveWasm()
    const reader = new ArchiveReader(mod, new Int8Array(data))

    mkdirWhenNotExist(outputPath)
    console.log(`正在提取：${ filePath }`)

    for (const entry of reader.entries()) {
      const pathname = parse(entry.getPathname()).base
      const buffer = entry.readData()
      
      if (buffer !== undefined) {
        writeFileSync(join(outputPath, pathname), buffer)
      }
    }

    reader.free()
    finish(outputPath, detailed)
  } catch (e) {
    throw e
  }
}

async function extractAll (folder, output, detailed) {
  const dir = parse(folder)
  const folderPath = resolve(folder)
  const outputPath = join(output, dir.name)
  let files

  try {
    files = readdirSync(folderPath)
  } catch (e) {
    throw new TypeError('致命错误 - 目标路径不为文件夹')
  }

  for (let i = 0, len = files.length; i < len; i++) {
    const file = files[i]
    const filePath = join(folderPath, file)

    console.log(`\n正在处理（${ i + 1 }／${ len }）：${ filePath }\n`)
    await extract(filePath, outputPath, detailed)
  }
}

function main ({ input, output, folder, detailed }) {
  const modeCount = [
    input,
    folder,
  ].map(isNotNull).filter(n => n).length

  if (modeCount > 1) {
    console.log('致命错误 - 存在冗余参数')
    return
  }

  if (!isNotNull(output)) {
    console.log('致命错误 - 输出文件夹路径不能为空')
    return
  }

  switch (true) {
    case isNotNull(folder):
      extractAll(folder, output, detailed)
      break
    case isNotNull(input):
      extract(input, output, detailed)
      break
    default:
      console.log('致命错误 - 至少包含一项输入路径')
      break
  }
}

main(args)