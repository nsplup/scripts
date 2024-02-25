const fs = require('fs')
const path = require('path')

function main (folderPath, limitCount = 5) {
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

main(...process.argv.slice(2))