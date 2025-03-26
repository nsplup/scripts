"use strict";

const { readdirSync, renameSync } = require('fs')
const path = require('path')
const { toArabic } = require('roman-numerals')
const parseArgs = require('./utils/parseArgs')
const args = parseArgs({
  define: {
    version: '0.0.1',
    description: '遍历文件夹重命名文件夹内所有子目录',
  },
  f: {
    alias: 'folder',
    type: 'str',
    help: '目标文件夹',
		symbol: 'folder',
  },
	p: {
		alias: 'pattern',
    type: 'str',
    help: '命名模板（默认值为"Vol.${PAD=2;START=1}"）;参数：[PAD 指定总长度，不足则向前填充零][START 指定初始值]；使用单引号传值',
		symbol: 'pattern',
		default: 'Vol.${PAD=2;START=1}'
	},
	'R': {
		alias: 'roman',
    type: 'bool',
    help: '针对罗马数字进行排序（默认值为 true）',
		symbol: 'roman',
		default: true
	},
	'D': {
		alias: 'dry-run',
    type: 'bool',
    help: '以空运行模式运行（默认值为 false）',
		default: false
	}
})

const RN_REG = /\b[IVXLCDM]+\b/gi
const P_REG = /\$\{[^\}]*\}/gi

function main ({ folder, pattern, R, D }) {
	if (typeof pattern !== 'string') {
		throw new TypeError('非法的命名模板参数')
	}

	const matched = pattern.match(P_REG)
	if (pattern.length === 0) {
		pattern = '${}'
	} else if (matched === null) {
		pattern += '_${}'
	}

	if (typeof folder === 'string' && folder.length > 0) {
		rename(folder, pattern, R, D)
	} else {
		throw new TypeError('非法的目标文件夹路径')
	}
}

function isValidRoman(str) {
  return /^M*(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(str)
}

function replaceRoman (str) {
	return str.replace(RN_REG, fragment => {
		let roman = fragment.toLocaleUpperCase()

		return isValidRoman(roman) ?
			toArabic(roman) :
			fragment
	})
}

function parsePattern (pattern) {
	let pStr = null
	const matched = pattern.match(P_REG)

	if (matched !== null) {
		pStr = matched[0]
			.slice(2, -1)
			.toLocaleLowerCase()
	}

	const result = pStr.split(';').reduce((prev, current) => {
		let [key, val] = current.split('=')

		val = parseInt(val)

		if (!isNaN(val)) {
			prev[key] = val
		}

		return prev
	}, {})

	return Object.assign({
		pad: 2,
		start: 1,
	}, result)
}

function toPattern (increment, pattern) {
	const { pad, start } = parsePattern(pattern)

	return pattern.replace(P_REG, fragment => {
		return (increment + start).toString().padStart(pad, '0')
	})
}

function rename (dirPath, pattern, R, D) {
	const dirs = readdirSync(dirPath)
	const failed = []
	
	/** 按照文件名排序 */
	const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
	if (R) {
		dirs.sort((a, b) => collator.compare(replaceRoman(a), replaceRoman(b)))
	} else {
		dirs.sort(collator.compare)
	}

	for (let i = 0, len = dirs.length; i < len; i++) {
		const dir = dirs[i]
		const oldName = path.resolve(dirPath, dir)
		try {
			const newName = path.resolve(
				dirPath,
				toPattern(i, pattern)
			)
			if (oldName !== newName) {
				console.log(`原目录名：${oldName}`)
				console.log(`新目录名：${newName}\n`)
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