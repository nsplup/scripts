"use strict";

const fs = require('fs')
const path = require('path')
const jschardet = require('jschardet')
const iconv = require('iconv-lite')
const parseArgs = require('./utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.1',
    description: '遍历文件夹合并文件夹内所有小说章节',
  },
  f: {
    alias: 'folder',
    type: 'str',
    help: '输入文件夹',
		symbol: 'folder',
  },
  o: {
    alias: 'output',
    type: 'str',
    help: '输出路径',
    symbol: 'output',
  },
})

function getEncoding (filePath) {
  return new Promise((res, rej) => {
    try {
      const STREAM = fs.createReadStream(path.resolve(filePath))
      const buffers = []
    
      STREAM.on('data', data => {
        buffers.push(data)
        const { encoding, confidence } = jschardet.detect(Buffer.concat(buffers))
        
        if (confidence >= 0.99) {
          res(encoding)
          STREAM.close()
        }
      })

      STREAM.on('end', () => {
        res(null)
      })
    } catch (err) {
      rej(err)
    }
  })
}

async function main ({ folder: input, output }) {
  const contents = fs.readdirSync(path.resolve(input))
  const title = path.basename(input)
  const novelContent = []

  /** 按照文件名排序 */
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  contents.sort(collator.compare)

  for (let i = 0, len = contents.length; i < len; i++) {
    const cPath = contents[i]
    const eTitle = path.basename(cPath, path.extname(cPath))
    const completedPath = path.join(input, cPath)
    const encoding = await getEncoding(completedPath)
    let content
    
    if (encoding === 'UTF-8') {
      content = fs.readFileSync(completedPath, { encoding: 'utf8' })
    } else {
      content = fs.readFileSync(completedPath)
      content = iconv.decode(content, encoding)
    }

    content = content.split(/[\r\n]/)
      .map(line => line.trim())
      .join('\n')
    novelContent.push(eTitle, content)
  }

  const outputPath = path.resolve(output, title + '.txt')
  fs.writeFileSync(outputPath, novelContent.join('\n\n'))
  console.log(`已完成: ${ outputPath }`)
}

main(args)