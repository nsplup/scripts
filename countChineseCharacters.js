"use strict";

const fs = require('fs')
const path = require('path')
const jschardet = require('jschardet')
const iconv = require('iconv-lite')
const parseArgs = require('./utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.1',
    description: '计算目标文件包含的汉字数量',
  },
  i: {
    alias: 'input',
    type: 'str',
    help: '输入路径',
    symbol: 'input'
  }
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

async function countChineseCharacters(filePath) {
  const startTime = Date.now()
  try {
    const fileContent = fs.readFileSync(filePath)
    const encoding = await getEncoding(filePath)
    const content = iconv.decode(fileContent, encoding)
    const chineseCharacters = content.match(/[\u4e00-\u9fa5]/g)
    const count = chineseCharacters ? chineseCharacters.length : 0
    console.log(`编码格式：${ encoding }`)
    console.log(`汉字数量：${ (count / 10000).toFixed(2) }万字`)
    console.log(`总计用时：${ Date.now() - startTime }ms`)
  } catch (error) {
    console.error('读取文件出错：', error)
  }
}

function main ({ input: filePath }) {
  if (filePath) {
    console.log(`目标路径：${ filePath }`)
    countChineseCharacters(filePath)
  } else {
    console.log('请提供文件路径作为命令行参数。')
  }
}

main(args)