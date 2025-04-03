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
    version: '0.0.2',
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
    help: '输出详细日志（默认值为 false）',
    default: false
  },
  a: {
    alias: 'ads',
    type: 'bool',
    help: '包含卷尾推广漫画（默认值为 false；无导航时不生效）',
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

const FP_REGEXP = /full\-path\=\"[^"]+\"/gi

function getFullPath (XML) {
  return [].concat(XML.match(FP_REGEXP))
    .map(value => parse(value.slice(11, -1)).base)
}

function getSpineAndManifest (outputPath, rootFilePath) {
  let i = 0, len = rootFilePath.length
  while (i < len) {
    let filePath = rootFilePath[i]
    try {
      const rootfileData = readFileSync(join(outputPath, filePath))
      const { spine, manifest } = parser.parse(rootfileData).package

      return { spine, manifest }
    } catch (err) {
      console.log(`无法从 [${ filePath }] 中找到 Spine 及 Manifest`)
      console.log('正在尝试下一项')
      i += 1
    }
  }

  console.log('致命错误 - 无法找到 Spine 及 Manifest')
  process.exit(1)
}

const ADS_KEYWORD = [
  '特別収録',
]
const ADS_REGEXP = new RegExp(ADS_KEYWORD.join('|'), 'gi')

function getAdsOrder (outputPath, manifestMap, spineArr) {
  const pattern = {
    'ncx': () => {
      const filePath = manifestMap['ncx']
      const fileData = readFileSync(join(outputPath, filePath))
      const navs = parser.parse(fileData).ncx.navMap.navPoint
      for (let item of navs) {
        const { navLabel, content } = item
        const ref = parse(content.src).base

        if (ADS_REGEXP.test(navLabel.text)) {
          return spineArr.indexOf(ref)
        }
      }
    },
    'nav': () => {
      const filePath = manifestMap['nav']
      const fileData = readFileSync(join(outputPath, filePath))
      const navs = parser.parse(fileData).html.body.nav.ol.li
      for (let item of navs) {
        const { a } = item
        const ref = parse(a['href']).base

        if (ADS_REGEXP.test(a['#text'])) {
          return spineArr.indexOf(ref)
        }
      }
    }
  }
  const patternEntries = Object.entries(pattern)

  for (let i = 0, len = patternEntries.length; i < len; i++) {
    const [name, callback] = patternEntries[i]
    try {
      const adsOrder = callback()

      if (adsOrder > 0) {
        return adsOrder
      } else { throw new Error('NOT FOUND ADSORDER') }
    } catch (e) {
      console.log(`无法从 [${ name }] 中找到导航`)
      console.log('正在尝试下一项')
    }
  }
  console.log('\x1B[40m%s\x1B[0m', '无法找到导航，本次提取 ADS 参数不生效')
}

function finish (outputPath, detailed, ads) {
  try {
    /** 从 container.xml 得到 rootfile 路径 */
    const containerXMLData = readFileSync(join(outputPath, 'container.xml'), { encoding: 'utf8' })
    const rootFilePath = getFullPath(containerXMLData)
    /** 从 rootfile 读取 spine 列表及 manifest 映射表 */
    const { spine, manifest } = getSpineAndManifest(outputPath, rootFilePath)
    const manifestMap = manifest.item.reduce((prev, current) => {
      const { id, href } = current

      prev[id] = parse(href).base

      return prev
    }, {})
    const spineArr = spine.itemref.map(({ idref }) => manifestMap[idref])
    let adsOrder = -1

    /** 从导航获取页码 */
    if (!ads) {
      adsOrder = getAdsOrder(outputPath, manifestMap, spineArr)
    }
    /** 根据 spine 列表建立图片顺序表 */
    let order = []
    for (let part of spineArr) {
      const partData = readFileSync(join(outputPath, part), { encoding: 'utf8' })
      order.push(getIMGPath(partData))
    }
    /** 剔除卷尾推广漫画 */
    if (!ads && adsOrder > 0) {
      order = order.slice(0, adsOrder)
      console.log('\x1B[40m%s\x1B[0m', '导航匹配成功，已剔除卷尾推广漫画')
    }
    /** 重命名并删除多余文件 */
    const files = readdirSync(outputPath)
    const oLen = order.length

    console.log('正在收尾\n')
    for (let file of files) {
      const filePath = join(outputPath, file)
      const index = order.indexOf(file)
      const oldFile = parse(filePath)

      if (index < 0) {
        rmSync(filePath)
        detailed && console.log(`已删除：${ oldFile.base }`)
      } else {
        const newName = (index + 1).toString().padStart(oLen.toString().length, '0') + oldFile.ext

        renameSync(filePath, join(outputPath, newName))
        if (detailed) {
          console.log(`重命名：`)
          console.log(`　　旧：${ oldFile.base }`)
          console.log(`　　新：${ newName }`)
        }
      }
    }
    console.log(`\n已完成：${ outputPath }`)

    const filesCount = readdirSync(outputPath).length
    if (filesCount === oLen) {
      console.log(`\x1b[32m已通过完整性校验\x1b[0m\n`)
    } else {
      console.log(`\x1b[31m未通过完整性校验\x1b[0m\n`)
    }
  } catch (e) {
    throw e
  }
}

async function extract (input, output, detailed, ads) {
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
    finish(outputPath, detailed, ads)
  } catch (e) {
    throw e
  }
}

async function extractAll (folder, output, detailed, ads) {
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
    await extract(filePath, outputPath, detailed, ads)
  }
}

function main ({ input, output, folder, detailed, ads }) {
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
      extractAll(folder, output, detailed, ads)
      break
    case isNotNull(input):
      extract(input, output, detailed, ads)
      break
    default:
      console.log('致命错误 - 至少包含一项输入路径')
      break
  }
}

main(args)