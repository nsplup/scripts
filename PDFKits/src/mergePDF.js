const { PDFDocument } = require('pdf-lib')
const { resolve } = require('path')
const { readFileSync, writeFileSync } = require('fs')

async function main (...rest) {
  if (rest.length < 3) {
    console.log('致命错误 - 缺少必要参数')
    return
  }

  const [output, ...input] = rest

  const startTime = Date.now()
  const pdfDoc = await PDFDocument.create()

  for (let i = 0, len = input.length; i < len; i++) {
    const current = resolve(input[i])
    const source = await PDFDocument.load(readFileSync(current))
    const pages = source.getPages()
    console.log(`正在合并（${ i + 1 } / ${ len }）：`)

    for (let j = 0, pLen = pages.length; j < pLen; j++) {
      const [page] = await pdfDoc.copyPages(source, [j])
  
      pdfDoc.addPage(page)
  
      console.log(`　　复制页面（${ j + 1 } / ${ pLen }）：${ current }`)
    }
  }

  console.log("正在创建 PDF 文件")
  const pdfBytes = await pdfDoc.save()
  const pdfPath = resolve(output)
  writeFileSync(pdfPath, pdfBytes)
  console.log(`已完成；耗时：${(Date.now() - startTime) / 1000}秒\n输出目标：${pdfPath}`)
}

module.exports = main