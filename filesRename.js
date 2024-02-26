"use strict";

const { readdirSync, renameSync, readFileSync } = require('fs')
const { createHash } = require('crypto')
const path = require('path')
const { ArgumentParser } = require('argparse')

const version = '0.0.1'
const parser = new ArgumentParser({
  description: '遍历文件夹重命名文件夹内所有文件'
})

parser.add_argument('-v', '--version', { action: 'version', version })
parser.add_argument('-f', '--folder', { type: 'str', help: '目标文件夹' })
parser.add_argument('-H', '--hash', { type: 'str', help: '是否重命名为哈希值', default: 'false' })

function main ({ folder, hash }) {
	rename(folder, hash === 'true')
}

function rename (dirPath, toHash) {
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
				renameSync(oldName, newName)
			}
		} catch (e) {
			failed.push(oldName)
		}
	}
	
	if (failed.length > 0) {
		console.log('\n处理失败项：')
		console.log(failed.map(n => ' '.repeat(4) + n).join('\n'))
	}
}

const args = parser.parse_args()
main(args)