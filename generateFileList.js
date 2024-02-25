const { resolve, basename } = require('path')
const { readdirSync, lstatSync, writeFileSync } = require('fs')

function generateFileList (dirpath, depth = 0) {
  const results = []
  const files = readdirSync(resolve(dirpath))
  
  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
  files.sort(collator.compare)
  
  for (let i = 0, len = files.length; i < len; i++) {
    const target = files[i]
    const resolvedPath = resolve(dirpath, target)
    const isDir = lstatSync(resolvedPath).isDirectory()

    results.push('　'.repeat(depth) + target)
    if (isDir) {
      results.push(generateFileList(resolvedPath, depth + 1))
    }
  }

  return results.join('\n')
}

function main (input, output) {
  const fileList = generateFileList(input)

  if (output) {
    const resolvedPath = resolve(resolve(output), basename(input) + '.txt')

    writeFileSync(resolvedPath, fileList, { encoding: 'utf8' })
    console.log(`输出目标：${resolvedPath}`)
  } else {
    console.log(fileList)
  }
}

main(...process.argv.slice(2))