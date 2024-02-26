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
    help: '向指定页码后添加空白页。Example: -b [INPUT] -o [OUTPUT] [...PAGE_INDEX]'
  },
  c: {
    alias: 'convert',
    type: 'str',
    help: '转换图片为 PDF。Example: -c [FOLDER] -o [OUTPUT]',
  },
  m: {
    alias: 'merge',
    type: 'str',
    help: '合并数个 PDF 文件。Example: -m [OUTPUT] [...INPUT_FILES]',
  },
  ra: {
    alias: 'rearrange',
    type: 'str',
    help: '截取指定范围的页面插入至指定页码前。Example: -ra [INPUT] -o [OUTPUT] [PAGE_INDEX] [START-END]',
  },
  rp: {
    alias: 'replace',
    type: 'str',
    help: '替换 PDF 文件页面。Example: -rp [INPUT] -o [OUTPUT] [...(PAGE_INDEX, IMG_PATH|EMPTY)]',
  },
  o: {
    alias: 'output',
    type: 'str',
    help: '输出路径',
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