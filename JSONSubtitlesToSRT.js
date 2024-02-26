"use strict";

const fs = require('fs')
const path = require('path')
const { ArgumentParser } = require('argparse')

const version = '0.0.1'
const parser = new ArgumentParser({
  description: '遍历文件夹并转换文件夹内所有 JSON 字幕为 SRT 格式'
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-f', '--folder', { type: 'str', help: '输入文件夹' })

/** 整合除法 */
function iDivision (divisor, dividend) {
  return [
    Math.floor(divisor / dividend), /** 商 */
    divisor % dividend /** 余数 */
  ]
}

function parseTime (time) {
  time = time.toString()
  let [second, millisecond] = time.split('.')

  let result = [];

  [60 * 60, 60, 1].reduce((prev, current) => {
    let [amount, remainder] = iDivision(prev, current)

    result.push(amount < 10 ? '0' + amount : amount)

    return remainder
  }, parseInt(second))

  millisecond = millisecond ? millisecond + '0'.repeat(3 - millisecond.length) : '000'

  return result.join(':') + ',' + millisecond
}

function convert (file) {
  file = path.resolve(file)
  
  let content = fs.readFileSync(file, { encoding: 'utf-8' })

  if (content) {
    content = JSON.parse(content).body
  }

  content = content.map((subtitles, index) => {
    return index + 1 + '\n'
      + parseTime(subtitles.from) + ' --> ' + parseTime(subtitles.to) + '\n'
      + subtitles.content.trim()
  }).join('\n\n')

  const subtitlesName = path.resolve(path.dirname(file), path.basename(file, path.extname(file))) + '.srt'
  fs.writeFileSync(subtitlesName, content, { encoding: 'utf-8' })
  console.log('Converted ' + subtitlesName)
}

function main ({ folder: dirPath }) {
  fs.readdirSync(path.resolve(dirPath)).forEach(file => {
    if (path.extname(file) === '.json') { convert(path.resolve(dirPath, file)) }
  })
}

const args = parser.parse_args()
main(args)