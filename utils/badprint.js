function main (arr) {
  const maxLength = 50
  
  arr.forEach(([name, description]) => {
    const lines = wrapText(description, maxLength)
    const paddedName = name.padEnd(maxLength, ' ')

    lines.forEach((line, index) => {
      if (index === 0) {
        console.log(`${paddedName} ${line}`)
      } else {
        console.log(`${' '.repeat(maxLength)} ${line}`)
      }
    })
  })
}

function wrapText(text, maxLength) {
  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  words.forEach((word) => {
    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine += `${word} `
    } else {
      lines.push(currentLine.trim())
      currentLine = `${word} `
    }
  })

  lines.push(currentLine.trim())
  return lines
}

module.exports = main