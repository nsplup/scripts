"use strict";

const { readdirSync, renameSync, readFileSync } = require('fs')
const { createHash } = require('crypto')
const path = require('path')
const parseArgs = require('./utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.2',
    description: '遍历文件夹重命名文件夹内所有文件',
  },
  f: {
    alias: 'folder',
    type: 'str',
    help: '目标文件夹',
		symbol: 'folder',
  },
	'H': {
		alias: 'hash',
		type: 'bool',
		help: '重命名为哈希值（默认值为 false）',
		default: false,
	},
	'D': {
		alias: 'dry-run',
    type: 'bool',
    help: '以空运行模式运行（默认值为 false）',
		default: false
	}
})

function main ({ folder, hash, D }) {
	if (typeof folder === 'string' && folder.length > 0) {
		rename(folder, hash, D)
	} else {
		throw new TypeError('非法的目标文件夹路径')
	}
}

function rename (dirPath, toHash, D) {
	const files = readdirSync(dirPath)
	const failed = []
	
	/** 按照文件名排序 */
	const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
	files.sort(collator.compare)
	
	for (let i = 0, len = files.length; i < len; i++) {
		const n = files[i]
		const index = i + 1
		const oldName = path.resolve(dirPath, n)
		try {
			let hash = null
			if (toHash) {
				const file = readFileSync(oldName)
				hash = createHash('sha256').update(file).digest('hex').toUpperCase()
			}
			const newName = toHash ?
				path.resolve(dirPath, hash + path.parse(n).ext) :
				path.resolve(dirPath, index.toString().padStart(8, '0') + path.parse(n).ext)
			if (oldName !== newName) {
				console.log(`原文件名：${oldName}`)
				console.log(`新文件名：${newName}\n`)
				!D && renameSync(oldName, newName)
			}
		} catch (e) {
			failed.push(oldName)
		}
	}
	
	if (failed.length > 0) {
		console.log('\n处理失败项：')
		console.log(failed.map(n => ' '.repeat(4) + n).join('\n'))
	}

	D && console.log('\x1B[40m%s\x1B[0m', '当前为空运行模式，不会有任何变更生效')
}

main(args)