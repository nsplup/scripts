const { resolve, extname, basename } = require('path')
const { readdirSync } = require('fs')

const EXTNAMES = [
  'avif',
  'jpg',
  'jpeg',
  'png'
]

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

function main (mangaPath, detailed = true) {
  let episodes
  switch (detailed) {
    case 'true':
      detailed = true
      break
    case 'false':
      detailed = false
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

main(...process.argv.slice(2))