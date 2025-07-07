const isNotNull = require('./isNotNull')

module.exports = function (modes, strType = false, print = '致命错误 - 存在冗余参数') {
  let modeCount
  if (strType) {
    modeCount = modes.map(isNotNull)
  }

  modeCount = modes.filter(n => n).length

  if (modeCount > 1) {
    console.log(print)
    process.exit(1)
  }
}