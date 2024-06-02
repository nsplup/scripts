const { PDFDocument } = require('pdf-lib')
const { resolve } = require('path')
const { readFileSync, writeFileSync } = require('fs')

async function main (...rest) {
  if (rest.length < 2) {
    console.log('致命错误 - 缺少必要参数')
    return
  }

  const [input, output] = rest
  const startTime = Date.now()
  const pdfDoc = await PDFDocument.create()
  const current = resolve(input)
  const source = await PDFDocument.load(readFileSync(current))
  const pages = source.getPages()

  for (let i = 0, pLen = pages.length; i < pLen; i++) {
    const [page] = await pdfDoc.copyPages(source, [i])

    pdfDoc.addPage(page)

    console.log(`复制页面（${ i + 1 } / ${ pLen }）：${ current }`)
  }

  console.log("正在创建 PDF 文件")
  const pdfBytes = await pdfDoc.save()
  const pdfPath = resolve(output)
  writeFileSync(pdfPath, pdfBytes)
  console.log(`已完成；耗时：${(Date.now() - startTime) / 1000}秒\n输出目标：${pdfPath}`)
}

module.exports = main