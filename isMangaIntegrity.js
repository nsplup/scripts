"use strict";

const { resolve, extname, basename } = require('path')
const { readdirSync } = require('fs')
const { ArgumentParser } = require('argparse')

const EXTNAMES = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'avif',
  'heif',
]
const version = '0.0.1'
const parser = new ArgumentParser({
  description: '遍历漫画根文件夹并检查章节文件夹是否完整'
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-f', '--folder', { type: 'str', help: '漫画根文件夹' })
parser.add_argument('-d', '--detailed', { type: 'str', help: '是否输出详细日志', default: 'true' })

function isMangaIntegrity (episodePath) {
  try {
    const images = readdirSync(resolve(episodePath))
    const computedImages = Array.from(
      new Set(
        images
          .filter(file => EXTNAMES.includes(extname(file).toLocaleLowerCase().slice(1)))
          .map(file => {
            return parseInt(basename(file, extname(file)).match(/\d+/))
          })
      )
    )
    const max = Math.max.apply(Math, computedImages)

    return computedImages.length >= max
  } catch (e) { return null }
}

function main ({ folder: mangaPath, detailed }) {
  let episodes
  if (detailed === 'false') {
    detailed = false
  } else {
    detailed = true
  }

  if (!mangaPath) {
    console.log(`错误：漫画根文件夹不能为空`)
    return
  }

  try {
    episodes = readdirSync(resolve(mangaPath))
  } catch (e) {
    detailed && console.log(`错误：${ mangaPath }`)
    return
  }

  /** 按照文件名排序 */
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  episodes.sort(collator.compare)

  episodes.forEach(path => {
    const result = isMangaIntegrity(resolve(mangaPath, path))

    switch (result) {
      case null:
        detailed && console.log(`错误：${ path }`)
        break
      case true:
        detailed && console.log(`\x1b[32m完整\x1b[0m：${ path }`)
        break
      case false:
        console.log(`\x1b[31m偏差\x1b[0m：${ path }`)
        break
    }
  })
}

const args = parser.parse_args()
main(args)