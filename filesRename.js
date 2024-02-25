const { readdirSync, renameSync } = require('fs')
const path = require('path')
const dirPath = process.argv[2]

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
		const newName = path.resolve(dirPath, index.toString().padStart(8, '0') + path.parse(n).ext)
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