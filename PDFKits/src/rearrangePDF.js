const { PDFDocument } = require('pdf-lib')
const { resolve } = require('path')
const { readFileSync, writeFileSync } = require('fs')

async function main (...rest) {
  if (rest.length !== 4) {
    console.log('致命错误 - 参数数量错误')
    return
  }

  let [input, output, target, range] = rest

  if (!input) {
    console.log('致命错误 - 输入路径不能为空')
    return
  }
  if (!output) {
    console.log('致命错误 - 输出路径不能为空')
    return
  }

  try {
    target = parseInt(target) - 1
    range = range.split('-').map(n => parseInt(n) - 1)

    if (target >= range[0] && target <= range[1]) {
      throw new Error()
    }
  } catch (e) {
    console.log('致命错误 - 预料之外的参数类型')
    return
  }

  const startTime = Date.now()
  const pdfDoc = await PDFDocument.create()
  const source = await PDFDocument.load(readFileSync(resolve(input)))
  const pages = source.getPages()
  const pagesIndex = [...new Array(pages.length).keys()]
  const readyToMove = []

  for (let i = 0, length = pages.length; i < length; i++) {
    if (i >= range[0] && i <= range[1]) {
      readyToMove.push(i)
      pagesIndex[i] = null
    }
  }

  const firstPart = pagesIndex.slice(0, target + 1)
  const lastPart = pagesIndex.slice(target + 1)

  const sequencedIndex = Array.prototype.concat.apply([], [firstPart, readyToMove, lastPart])
    .filter(n => n !== null)

  for (let i = 0, length = sequencedIndex.length; i < length; i++) {
    const index = sequencedIndex[i]
    const [page] = await pdfDoc.copyPages(source, [index])
    pdfDoc.addPage(page)
    console.log(`重新排序：${i} => ${index}`)
  }

  console.log("正在创建 PDF 文件")
  const pdfBytes = await pdfDoc.save()
  const pdfPath = resolve(output)
  writeFileSync(pdfPath, pdfBytes)
  console.log(`已完成；耗时：${(Date.now() - startTime) / 1000}秒\n输出目标：${pdfPath}`)
}

module.exports = main