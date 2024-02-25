const { PDFDocument } = require('pdf-lib')
const { resolve, extname } = require('path')
const { readFileSync, writeFileSync } = require('fs')

async function main (...rest) {
  if (rest.length < 4) {
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

  const targetIndex = []
  const targetMap = {}

  let p = 0, len = targets.length
  while (p < len) {
    let key = targets[p], val = targets[p + 1]
    if (key.includes('-')) {
      const [min, max] = key
        .split('-')
        .map(n => parseInt(n) - 1)
        .sort((a, b) => a - b)
      
      Array.from({ length: max - min + 1 }, (_, index) => index)
        .forEach(n => {
          const newKey = n + min
          targetMap[newKey] = val
          targetIndex.push(newKey)
        })
    } else {
      const newKey = parseInt(key) - 1
      targetMap[newKey] = val
      targetIndex.push(newKey)
    }
    p += 2
  }

  for (let i = 0, length = pages.length; i < length; i++) {
    if (targetIndex.includes(i)) {
      const image = targetMap[i]
      if (image.length === 0) {
        console.log(`复制页面（${ i + 1 } / ${ length }）：忽略当前页面`)
      } else {
        const ext = extname(image).slice(1).toLowerCase()
    
        if (!['jpg', 'png'].includes(ext)) {
          console.log(`致命错误 - 不受支持的图片格式：${image}`)
          return
        }
    
        const picBinary = readFileSync(resolve(image))
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
    
        console.log(`替换页面（${ i + 1 } / ${ length }）：${image}`)
      }
    } else {
      const [page] = await pdfDoc.copyPages(source, [i])

      pdfDoc.addPage(page)

      console.log(`复制页面（${ i + 1 } / ${ length }）：${resolve(input)}`)
    }
  }

  console.log("正在创建 PDF 文件")
  const pdfBytes = await pdfDoc.save()
  const pdfPath = resolve(output)
  writeFileSync(pdfPath, pdfBytes)
  console.log(`已完成；耗时：${(Date.now() - startTime) / 1000}秒\n输出目标：${pdfPath}`)
}

main(...process.argv.slice(2))