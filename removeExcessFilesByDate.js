"use strict";

const fs = require('fs')
const path = require('path')
const { ArgumentParser } = require('argparse')

const version = '0.0.1'
const parser = new ArgumentParser({
  description: '遍历文件夹，以修改日期排序，从日期久远的文件开始删除直到满足保留的文件个数'
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-f', '--folder', { type: 'str', help: '目标文件夹' })
parser.add_argument('-c', '--count', { type: 'int', help: '需要保留的文件个数', default: 5 })

const args = parser.parse_args()
function main ({ folder: folderPath, count: limitCount }) {
  folderPath = path.resolve(folderPath)
  // 读取文件夹中的所有文件
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err)
      return
    }

    // 根据修改日期排序文件
    files = files
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(folderPath, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)
      .map((file) => file.name)

    // 删除过期的文件
    const filesToDelete = files.slice(limitCount)
    filesToDelete.forEach((file) => {
      const filePath = path.join(folderPath, file)
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err)
          return
        }
        console.log('Deleted file:', filePath)
      })
    })
  })
}

main(args)