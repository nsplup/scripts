const { PDFDocument } = require('pdf-lib')
const { resolve } = require('path')
const { readFileSync, writeFileSync } = require('fs')

async function main (...rest) {
  if (rest.length < 3) {
    console.log('致命错误 - 缺少必要参数')
    return
  }

  const [input, output, ...targets] = rest

  if (!input) {
    console.log('致命错误 - 输入路径不能为空')
    return
  }
  if (!output) {
    console.log('致命错误 - 输出路径不能为空')
    return
  }
  const startTime = Date.now()
  const pdfDoc = await PDFDocument.create()
  const source = await PDFDocument.load(readFileSync(resolve(input)))
  const pages = source.getPages()

  const computedTargets = targets.map((n, i) => parseInt(n) - 1)

  let count = 0
  for (let i = 0, length = pages.length; i < length; i++) {
    if (computedTargets.includes(i)) {
      const prevIndex = Math.max(0, i - 1)
      const { width, height } = pages[prevIndex].getSize()

      pdfDoc.addPage([width, height])
      console.log(`新增页面（${ i + count++ } / ${ length + computedTargets.length }）：空白页面`)
    }

    const [page] = await pdfDoc.copyPages(source, [i])

    pdfDoc.addPage(page)

    console.log(`复制页面（${ i + 1 + count } / ${ length + computedTargets.length }）：${resolve(input)}`)
  }

  console.log("正在创建 PDF 文件")
  const pdfBytes = await pdfDoc.save()
  const pdfPath = resolve(output)
  writeFileSync(pdfPath, pdfBytes)
  console.log(`已完成；耗时：${(Date.now() - startTime) / 1000}秒\n输出目标：${pdfPath}`)
}

main(...process.argv.slice(2))