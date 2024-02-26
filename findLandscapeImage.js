"use strict";

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { ArgumentParser } = require('argparse')

const version = '0.0.1'
const parser = new ArgumentParser({
  description: '遍历文件夹，寻找所有横向图片并列出'
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-f', '--folder', { type: 'str', help: '目标文件夹' })

function isImage(file) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.avif', '.heif']
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

function main({ folder: folderPath }) {
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

const args = parser.parse_args()
main(args)