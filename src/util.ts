import * as path from 'path';
import * as fs from 'fs';

const extensions = ['.js', '.ts', '.json', '.jsx', '.tsx', '.vue', '.css', '.mcss', '.scss', '.less', '.html'];

async function readDir(dirPath: string) {
  let result = await new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, result) => {
      if (err) reject(err);
      resolve(result);
    })
  });
  return <string[]>result;
}
async function stat(filePath: string) {
  return await new Promise((resolve, reject) => {
    fs.stat(filePath, (err, result) => {
      if (err) reject(err);
      resolve(result);
    })
  });
}

export async function fixFilePathExtension(filePath: string) {
  const dirPath = path.join(filePath, '../');
  const fileName = filePath.replace(dirPath, '');

  // 含有扩展名, 直接返回
  if (fileName.indexOf('.') > 0) return filePath;

  async function traverse(dirPath: string, fileName: string) {
    let dir = await readDir(dirPath);
    for (let ext of extensions) {
      if (dir.indexOf(fileName + ext) > -1) {
        return path.join(dirPath, fileName + ext);
      }
    }
    if (dir.indexOf(fileName) !== -1) {
      let stats = await stat(path.join(dirPath, fileName)) as fs.Stats;
      if (stats.isFile()) {
        return path.join(dirPath, fileName);
      } else if (stats.isDirectory()) {
        return 'dir';
      }
    }
  }
  // 遍历文件所在目录, 匹配文件名.后缀
  let filePathWithExt = await traverse(dirPath, fileName);
  if (filePathWithExt === 'dir') {
    filePathWithExt = await traverse(filePath, 'index');
  }
  if (filePathWithExt && filePathWithExt !== 'dir') return filePathWithExt;
}