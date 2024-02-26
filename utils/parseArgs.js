"use strict";

const badprint = require('./badprint')
const path = require('path')

let __version__
let __description__

function print (msg) {
  typeof msg === 'string' && msg.length > 0 && console.log(msg)
}

function printHelp (scheme) {
  let { define, ..._scheme } = scheme
  let useage = 'Usage: ' + path.basename(process.argv[1]) + ' [-v] [-h]'
  let useage_opt = Object.entries(_scheme).map(([key, val]) => {
    const alias = val.alias

    return typeof alias === 'string' && alias.length > 0 ?
      `[-${ key } ${ alias.toUpperCase() }]` :
      `[-${ key }]`
  })
  print([useage].concat(useage_opt).join(' '))
  printVersion()
  console.log('')
  print(__description__)
  console.log('\nOptional Arguments:')
  const schemeEntries = Object.entries(_scheme).map(([key, val]) => {
    let alias = undefined
    key = '  -' + key

    if (val.hasOwnProperty('alias')) {
      const _alias = val.alias
      key += ` ${ _alias.toUpperCase() }`
      alias = '--' + _alias + ` ${ _alias.toUpperCase() }`
    }
    return [[key, alias].filter(str => str).join(', '), val.help]
  })
  badprint(schemeEntries)
}

function printVersion () {
  print(__version__)
}

function parse () {
  const argv = process.argv.slice(2)
  const args = {}
  const isolated = []

  let key = null
  for (let i = 0, len = argv.length; i < len; i++) {
    const current = argv[i]
    const isOpt = current.startsWith('-')
    const hasVal = current.includes('=')

    if (isOpt) {
      if (hasVal) {
        const [_key, val] = current.split('=')
        args[_key] = val
      } else if (key === null) {
        key = current
      } else if (key !== null) {
        args[key] = true
        key = current
      }
    } else {
      if (key === null) {
        isolated.push(current)
      } else {
        args[key] = current
        key = null
      }
    }
  }
  if (key !== null) {
    args[key] = true
    key = null
  }

  args.__isolated__ = isolated

  return args
}

function linkScheme (scheme) {
  let { define, ..._scheme } = Object.assign({ define: {} }, scheme)
  const result = Object.assign({}, _scheme)
  const schemeValues = Object.entries(_scheme)
  for (let i = 0, len = schemeValues.length; i < len; i++) {
    const [key, val] = schemeValues[i]

    if (val.hasOwnProperty('alias')) {
      result[val.alias] = Object.assign({}, val, { __shortName__: key })
    }
  }

  result.__define__ = define

  return result
}

const LEGAL_TYPE = [
  'str', 'string',
  'num', 'number', 'float',
  'int', 'integer',
  'bool', 'boolean',
]
const IS_ARR_REG_EXP = /^arr(ay)?\:/ /** Example: arr:int */
function convert (val, type) {
  let result
  let toArr = IS_ARR_REG_EXP.test(type)
  if (toArr) {
    type = type.replace(IS_ARR_REG_EXP, '')
    try {
      result = JSON.parse(val)
      result = result.map(_val => convert(_val, type))
    } catch (e) { console.error(e) }
  } else {
    if (!LEGAL_TYPE.includes(type)) { return new TypeError('Unsupported Type.') }

    switch (type) {
      case 'str':
      case 'string':
        result = val
        break
      case 'num':
      case 'number':
      case 'float':
        result = parseFloat(val)
        break
      case 'int':
      case 'integer':
        result = parseInt(val)
        break
      case 'bool':
      case 'boolean':
        result = toBoolean(val)
        break
    }
  }
  return result
}

function toBoolean (val) {
  let result

  switch (val) {
    case 'true':
      result = true
      break
    case 'false':
      result = false
      break
    default:
      result = !!val
  }

  return result
}

/**
 * Scheme {
 *   [shortName]: {
 *     type,
 *     alias,
 *     help,
 *     default,
 *   },
 *   define: {
 *     isolated: [alias string],
 *     version: [version string],
 *     description: [description string],
 *   }
 * }
 */

function main (scheme) {
  if (!(typeof scheme === 'object' && !Array.isArray(scheme))) {
    return new TypeError('Illegal Scheme.')
  }
  const linkedScheme = linkScheme(scheme) /** 处理 alias */
  const result = {}
  const { __isolated__, ...args } = parse()
  const define = linkedScheme.__define__
  if (define.hasOwnProperty('isolated')) {
    result[define.isolated] = __isolated__
  }
  if (define.hasOwnProperty('version')) {
    __version__ = define.version
  }
  if (define.hasOwnProperty('description')) {
    __description__ = define.description
  }
  if (args.hasOwnProperty('-h') || args.hasOwnProperty('--help')) { /** 打印帮助 */
    printHelp(scheme)
    process.exit()
  }
  if (args.hasOwnProperty('-v') || args.hasOwnProperty('--version')) { /** 打印版本信息 */
    printVersion()
    process.exit()
  }
  const argsEntries = Object.entries(args)
  for (let i = 0, len = argsEntries.length; i < len; i++) {
    const [key, val] = argsEntries[i]
    let isAlias = false
    const optName = key.replace(/^\-+/, fragment => {
      const fLen = fragment.length
      isAlias = fLen === 2
      return fLen <= 2 ?
        '' :
        new TypeError('Unsupported Argument.')
    })
    const cScheme = linkedScheme[optName]

    if (cScheme && cScheme.hasOwnProperty('type')) { /** 转换值 */
      const convertedVal = convert(val, cScheme.type)
      result[optName] = convertedVal
      if (isAlias) { result[cScheme.__shortName__] = convertedVal }
      else if (cScheme.hasOwnProperty('alias')) { /** 处理 alias 的值 */
        result[cScheme.alias] = convertedVal
      }
    }
  }
  const schemeEntries = Object.entries(linkedScheme)
  for (let i = 0, len = schemeEntries.length; i < len; i++) { /** 默认值处理 */
    const [key, cScheme] = schemeEntries[i]

    const _default = cScheme.default
    if (_default !== undefined) {
      if (!result.hasOwnProperty(key)) {
        result[key] = _default
      }
      const { alias } = cScheme
      if (alias && !result.hasOwnProperty(alias)) {
        result[alias] = _default
      }
    }
  }
  return result
}

module.exports = main