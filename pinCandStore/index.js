const { readFileSync, writeFileSync, renameSync } = require('fs')
const { resolve, join } = require('path')
const { spawn } = require('child_process')
const parseArgs = require('../utils/parseArgs')
const isNotNull = require('../utils/isNotNull')
const onlySingleMode = require('../utils/onlySingleMode')
const findFileSync = require('../utils/findFileSync')

const CONF_PATH = './config.json'
const WEASEL_DEPLOYER = 'WeaselDeployer.exe'

const args = parseArgs({
  define: {
    version: '0.0.1',
    description: '雾凇／白霜方案 RIME 置顶词管理',
  },
  a: {
    alias: 'add',
    type: 'bool',
    help: '添加模式；向指定字符编码的置顶词列表末尾添加置顶词',
  },
  g: {
    alias: 'get',
    type: 'bool',
    help: '获得指定字符编码的置顶词列表',
  },
  s: {
    alias: 'set',
    type: 'bool',
    help: '设置模式；设置指定字符编码的置顶词列表',
  },
  e: {
    alias: 'encoding',
    type: 'str',
    help: '需要指定的字符编码；以空格分隔每个字的字符编码',
  },
  c: {
    alias: 'character',
    type: 'str',
    help: '需要添加或设置的置顶词列表；以空格分隔词组',
  },
  d: {
    alias: 'deploy',
    type: 'bool',
    help: '自动执行重新部署',
  },
  'D': {
    alias: 'dry-run',
    type: 'bool',
    help: '以空运行模式运行（默认值为 false）',
    default: false
  }
})

let config = null

function getConf () {
  if (config === null) {
    config = JSON.parse(readFileSync(join(__dirname, CONF_PATH), { encoding: 'utf8' }))
  }
  return config
}

let pinCand = null
function getPinCand () {
  if (pinCand === null) {
    const { path: pinCandPath } = getConf()
    pinCand = readFileSync(resolve(pinCandPath), { encoding: 'utf8' })
    pinCand = parsePinCand(pinCand)
  }
  return pinCand
}
function parsePinCand (string) {
  const result = []
  const lines = string.split(/[\r\n]+/)

  for (let line of lines) {
    let [encoding, character] = line.split(/\t/)
    encoding = encoding.slice(2)
    character = character.split(/\s/)

    result.push({ encoding, character })
  }

  return result
}

function main ({
  add,
  get,
  set,

  encoding,
  character,
  D,
  deploy,
}) {
  onlySingleMode([add, get, set])

  if (!isNotNull(encoding)) {
    console.log('致命错误 - 字符编码不能为空')
    return
  }
  if (!isNotNull(character) && !get) {
    console.log('致命错误 - 置顶词列表不能为空')
    return
  }

  const store = getPinCand()
  let newStore = null

  switch (true) {
    case add:
      newStore = modifyPinCand(encoding, character, store, false)
      break
    case set:
      newStore = modifyPinCand(encoding, character, store, true)
      break
    case get:
      getPinCandCharacter(encoding, store)
      break
  }

  if (get) { return } /** 模式为 get 时提前跳出 */
  if (D) {
    console.log('\x1B[40m%s\x1B[0m', '当前为空运行模式，不会有任何变更生效')
  } else {
    save(newStore)
    deploy && doDeploy()
  }
}

function modifyPinCand (encoding, character, store, setMode = false) {
  character = character.split(/\s/)

  let newCharacter = [], newStore = [], oldCharacter = []

  for (let item of store) {
    const { encoding: itemEncoding, character: itemCharacter } = item
    if (itemEncoding === encoding) {
      newCharacter = newCharacter.concat(itemCharacter)
      oldCharacter = itemCharacter
    } else {
      newStore.push(item)
    }
  }

  newCharacter = setMode ?
    character :
    newCharacter.concat(character)
  newCharacter = dedupe(newCharacter)
  
  console.log(`字符编码　　："${ encoding }"`)
  console.log(`旧置顶词列表：${ print(oldCharacter) }`)
  console.log(`变更为　　　：${ print(newCharacter) }`)
  
  newStore.push({ encoding, character: newCharacter })
  newStore = sort(newStore)

  return newStore
}
function getPinCandCharacter (encoding, store) {
  let result = []
  for (let item of store) {
    const { encoding: itemEncoding, character: itemCharacter } = item
    if (itemEncoding === encoding) {
      result = itemCharacter
      break
    }
  }
  console.log(`字符编码　："${ encoding }"`)
  console.log(`置顶词列表：${ print(result) }`)
}
function dedupe (character) {
  return Array.from(new Set(character))
}
function sort (store) {
  const result = store.concat()

  result.sort((a, b) => a.encoding.localeCompare(b.encoding))

  return result
}
function print (character) {
  return Array.isArray(character) && character.length > 0 ?
    character.map(word => `"${ word }"`).join(', ') :
    '""'
}
function format (store) {
  const result = []

  for (let item of store) {
    let { encoding, character } = item
    encoding = `- ${encoding}`
    character = character.join(' ')
    result.push([encoding, character].join('\t'))
  }

  return result.join('\n')
}
function save (store) {
  const content = format(store)
  const { path: pinCandPath } = getConf()
  let oldPath = resolve(pinCandPath)
  let newPath = oldPath + '.backup'
  
  renameSync(oldPath, newPath)
  writeFileSync(oldPath, content, { encoding: 'utf8' })
}
function doDeploy () {
  const { deploy: deployPath } = getConf()
  const command = ['/deploy']
  const program = findFileSync(deployPath, WEASEL_DEPLOYER)
  
  const child = spawn(program, command, {
    detached: true,
    stdio: 'ignore'
  })

  // 解除子进程对象的引用，允许父进程独立退出
  child.unref()
}

main(args)