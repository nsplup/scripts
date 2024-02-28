const addBlankPagesToPDF = require('./src/addBlankPagesToPDF')
const convertImagesToPDF = require('./src/convertImagesToPDF')
const mergePDF = require('./src/mergePDF')
const rearrangePDF = require('./src/rearrangePDF')
const replacePagesInPDF = require('./src/replacePagesInPDF')
const parseArgs = require('../utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.1',
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
  o: {
    alias: 'output',
    type: 'str',
    help: '输出路径',
    symbol: 'output',
  }
})

function isNotNull (val) {
  return typeof val === 'string' && val.length > 0
}

function main ({
  blank,
  convert,
  merge,
  rearrange,
  replace,

  output,
  rest,
}) {
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
  }
}

main(args)