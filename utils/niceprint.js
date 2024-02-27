const fullWidthRegExp = /[^\x00-\xff]/
function calculateValue(inputString) {
  let result = 0
  for (let i = 0; i < inputString.length; i++) {
    const char = inputString.charAt(i)
    if (fullWidthRegExp.test(char)) {
      result += 2
    } else {
      result += 1
    }
  }
  return result
}

const punctuation = [
  '。',
  '”',
  '：',
  '，', ',',
  '」', '』',
  '!', '！',
  '?', '？',
  '}',
  ']', '】',
  ';', '；',
  ')', '）'
]
function sliceStr (str, maxWidth) {
  let lines

  lines = str.split(/[\r\n]/).map(line => sliceLine(line, maxWidth))
  lines = lines.flat().map(line => line.trim())
  /** 处理行开头标点符号 */
  for (let i = 1, len = lines.length; i < len; i++) {
    const prev = lines[i - 1]
    const current = lines[i]
    const pChar = prev.charAt(prev.length - 1)
    const char = current.charAt(0)
    if (punctuation.includes(char)) {
      lines[i - 1] = pChar === char ?
        prev :
        prev + char
      lines[i] = current.slice(1)
    }
  }
  return lines
}
const noWrapRegExp = /[a-z\/\.\'\"\-\:]/i
function sliceLine (line, maxWidth) {
  const result = []
  
  let i = 0
  let fragment = ''
  while (i < line.length) {
    const char = line.charAt(i)
    const doNotWrap = calculateValue(fragment + char) <= maxWidth
    const isNoWrapWord = noWrapRegExp.test(char)
    if (doNotWrap) {
      fragment += char
      i++
    } else {
      if (isNoWrapWord) {
        while (noWrapRegExp.test(line.charAt(--i))) {
          fragment = fragment.slice(0, -1)
        }
      }
      result.push(fragment)
      fragment = ''
    }
  }
  if (fragment.length > 0) { result.push(fragment) }
  return result
}

function padEnd (str, maxWidth, fill = ' ') {
  return str + fill.repeat(maxWidth - calculateValue(str))
}

function merge (left, right, maxWidth) {
  const result = []
  const lDone = sliceStr(left, maxWidth)
  const rDone = sliceStr(right, maxWidth)

  /** 当左侧数组长度为一且字符串宽度超过上限宽度时，向右侧数组头部推入空白字符串 */
  if (lDone.length === 1 && (calculateValue(lDone[0]) > maxWidth)) {
    rDone.unshift('')
  }
  const maxLen = Math.max(lDone.length, rDone.length)
  for (let i = 0; i < maxLen; i++) {
    let part = padEnd(lDone[i] || '', maxWidth)
    result.push(part + rDone[i])
  }

  return result
}

function main (entries, maxWidth, indent = 0) {
  const result = entries.reduce((prev, current) => {
    const [left, right] = current
    prev = prev.concat(merge(left, right, maxWidth))
    return prev
  }, [])

  for (let i = 0, len = result.length; i < len; i++) {
    console.log(' '.repeat(indent) + result[i])
  }
}

module.exports = main