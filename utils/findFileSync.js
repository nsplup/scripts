const fs = require('fs');
const path = require('path');

/**
 * 同步查找指定文件在目录或其子目录中是否存在
 * @param {string} startPath - 开始查找的目录路径
 * @param {string} fileNameToFind - 要查找的文件名
 * @returns {string|null} 返回找到的文件的完整路径，如果未找到则返回 null
 */
module.exports = function findFileSync (startPath, fileNameToFind) {
  try {
    const files = fs.readdirSync(startPath);

    for (const file of files) {
      const filePath = path.join(startPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && file === fileNameToFind) {
        return filePath; // 找到文件，返回路径
      } else if (stat.isDirectory()) {
        const foundPath = findFileSync(filePath, fileNameToFind); // 递归查找子目录
        if (foundPath) {
          return foundPath; // 如果在子目录中找到，则返回
        }
      }
    }
    return null; // 未找到
  } catch (err) {
    console.error(`查找文件时发生错误: ${err.message}`);
    return null;
  }
}