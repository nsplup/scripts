"use strict";

const fs = require('fs')
const path = require('path')
const parseArgs = require('./utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.1',
    description: '遍历文件夹，以修改日期排序，从日期久远的文件开始删除直到满足保留的文件个数',
  },
  f: {
    alias: 'folder',
    type: 'str',
    help: '目标文件夹',
		symbol: 'folder',
  },
  c: {
    alias: 'count',
    type: 'int',
    help: '需要保留的文件个数',
    default: 5,
		symbol: 'count',
  },
})

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