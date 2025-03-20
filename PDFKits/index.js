const { parse, join, resolve } = require('path')
const addBlankPagesToPDF = require('./src/addBlankPagesToPDF')
const convertImagesToPDF = require('./src/convertImagesToPDF')
const mergePDF = require('./src/mergePDF')
const rearrangePDF = require('./src/rearrangePDF')
const replacePagesInPDF = require('./src/replacePagesInPDF')
const removePDFMetaData = require('./src/removePDFMetaData')
const parseArgs = require('../utils/parseArgs')
const mkdirWhenNotExist = require('../utils/mkdirWhenNotExist')
const isNotNull = require('../utils/isNotNull')
const args = parseArgs({
  define: {
    version: '0.0.2',
    description: 'PDF 文件处理工具集',
    isolated: 'rest'
  },
  b: {
    alias: 'blank',
    type: 'str',
    help: '向指定页码后添加空白页。\nExample: -b [INPUT] -o [OUTPUT] [...PAGE_INDEX]',
    symbol: 'input',
  },
  c: {
    alias: 'convert',
    type: 'str',
    help: '转换图片为 PDF。\nExample: -c [FOLDER] -o [OUTPUT]',
    symbol: 'folder',
  },
  m: {
    alias: 'merge',
    type: 'str',
    help: '合并数个 PDF 文件。\nExample: -m [OUTPUT] [...INPUT_FILES]',
    symbol: 'output',
  },
  ra: {
    alias: 'rearrange',
    type: 'str',
    help: '截取指定范围的页面插入至指定页码前。\nExample: -ra [INPUT] -o [OUTPUT] [PAGE_INDEX] [START-END]',
    symbol: 'input',
  },
  rp: {
    alias: 'replace',
    type: 'str',
    help: '替换 PDF 文件页面。\nExample: -rp [INPUT] -o [OUTPUT]\n[...(PAGE_INDEX, IMG_PATH|EMPTY)]',
    symbol: 'input',
  },
  rm: {
    alias: 'remove',
    type: 'str',
    help: '去除 PDF 文件中的附件、目录。\nExample: -rm [INPUT] -o [OUTPUT]',
    symbol: 'input',
  },
  o: {
    alias: 'output',
    type: 'str',
    help: '输出路径',
    symbol: 'output',
  }
})

function main ({
  blank,
  convert,
  merge,
  rearrange,
  replace,
  remove,

  output,
  rest,
}) {
  const modeCount = [
    blank,
    convert,
    merge,
    rearrange,
    replace,
    remove,
  ].map(isNotNull).filter(n => n).length

  if (modeCount > 1) {
    console.log('致命错误 - 存在冗余参数')
    return
  }

  switch (true) {
    case isNotNull(blank):
      addBlankPagesToPDF(blank, output, ...rest)
      break
    case isNotNull(convert):
      convertImagesToPDF(convert, output)
      break
    case isNotNull(merge):
      output = merge
      mergePDF(output, ...rest)
      break
    case isNotNull(rearrange):
      rearrangePDF(rearrange, output, ...rest)
      break
    case isNotNull(replace):
      replacePagesInPDF(replace, output, ...rest)
      break
    case isNotNull(remove):
      const basename = parse(remove).base
      const outputDir = resolve(output)
      mkdirWhenNotExist(outputDir)
      removePDFMetaData(remove, join(outputDir, basename))
      break
  }
}

main(args)