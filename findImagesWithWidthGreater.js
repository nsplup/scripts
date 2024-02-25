const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

function isImage(file) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const ext = path.extname(file).toLowerCase()
  return imageExtensions.includes(ext)
}

function isWidthGreaterThanHeight(imagePath) {
  return sharp(path.resolve(imagePath))
    .metadata()
    .then(metadata => metadata.width > metadata.height)
    .catch(err => {
      console.error(`Error reading image metadata: ${imagePath}`, err)
      return false
    })
}

function main(folderPath) {
  folderPath = path.resolve(folderPath)
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err)
      return
    }

    files.forEach(file => {
      const filePath = path.join(folderPath, file)

      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Error reading file:', filePath, err)
          return
        }

        if (stats.isFile() && isImage(file)) {
          isWidthGreaterThanHeight(filePath)
            .then(isGreater => {
              if (isGreater) {
                console.log(filePath)
              }
            })
            .catch(err => {
              console.error('Error checking image:', filePath, err)
            })
        }
      })
    })
  })
}

main(...process.argv.slice(2))