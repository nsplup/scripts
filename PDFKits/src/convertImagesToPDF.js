const { PDFDocument } = require('pdf-lib')
const { resolve, extname } = require('path')
const { readdirSync, readFileSync, writeFileSync } = require('fs')

async function main (input, output) {
  if (!input) {
    console.log('致命错误 - 图片路径不能为空')
    return
  }
  if (!output) {
    console.log('致命错误 - 输出路径不能为空')
    return
  }
  const startTime = Date.now()
  const pdfDoc = await PDFDocument.create()
  const images = readdirSync(resolve(input))

  /** 按照文件名排序 */
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  images.sort(collator.compare)

  for (let i = 0, length = images.length; i < length; i++) {
    const image = images[i]
    const ext = extname(image).slice(1).toLowerCase()

    if (!['jpg', 'png'].includes(ext)) {
      console.log(`致命错误 - 不受支持的图片格式：${image}`)
      return
    }

    const picBinary = readFileSync(resolve(input, image))
    let target
    switch (ext) {
      case 'jpg':
        target = await pdfDoc.embedJpg(picBinary)
        break
      case 'png':
        target = await pdfDoc.embedPng(picBinary)
    }

    const { width, height } = target
    const page = pdfDoc.addPage([width, height])
    page.drawImage(target, {
      x: 0,
      y: 0,
      width: width,
      height: height
    })

    console.log(`正在绘制（${ i + 1 } / ${ length }）：${image}`)
  }

  console.log("正在创建 PDF 文件")
  const pdfBytes = await pdfDoc.save()
  const pdfPath = resolve(output)
  writeFileSync(pdfPath, pdfBytes)
  console.log(`已完成；耗时：${(Date.now() - startTime) / 1000}秒\n输出目标：${pdfPath}`)
}

module.exports = main