import * as vscode from 'vscode';
import * as path from 'path';
import Configuration from './Configuration';
import { fixFilePathExtension } from './util';

export default class DefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly _configuration: Configuration) {
  }
  provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition> {
    return this._getFileRealPosition(document, position);
  }
  private async _getFileRealPosition(document: vscode.TextDocument, position: vscode.Position) {
    const pathObj = this._getImportPathObj(document.lineAt(position));

    let realFilePath: string;
    if (pathObj && pathObj.range.contains(position)) {
      realFilePath = this._tranformAliasPath(pathObj.path);

      // 由于 vscode 不能正确识别 vue 文件的正常导入, 所以此处添加对 vue 文件的正常引入支持
      if (!realFilePath && document.fileName.endsWith('.vue') && pathObj.path.startsWith('.')) {
        realFilePath = path.resolve(document.fileName, '../', pathObj.path);
      }
    }

    if (realFilePath) {
      realFilePath = await fixFilePathExtension(realFilePath)
    }
    if (realFilePath) {
      return this._getFileLocationFromPath(realFilePath)
    };
  }
  private _getImportPathObj(textLine: vscode.TextLine): { path: string, range: vscode.Range } | undefined {
    let index = 0;
    const tokens = textLine.text.split(' ')
      .map((value, i) => {
        let token = {
          value,
          start: index,
          end: index + value.length,
        }
        index = index + value.length + 1;
        return token;
      })
      .filter(token => token.value);

    const importIndex = tokens.findIndex(token => token.value === 'import');
    const fromIndex = tokens.findIndex(token => token.value === 'from');
    // 判断该语句是一个 es6 import 语句, 然后取出 from 之后的文件路径
    if (importIndex === -1 || fromIndex === -1 || fromIndex < importIndex || fromIndex >= tokens.length - 1) return;

    let { value, start, end } = tokens[fromIndex + 1];
    const newValue = value.replace(/['";]/g, '');
    if (!newValue) return;

    if (`'"`.indexOf(value[0]) > -1) {
      start++;
    }
    if (`'";`.indexOf(value[value.length - 1]) > -1) {
      end--;
    }
    if (`'"`.indexOf(value[value.length - 2]) > -1) {
      end--;
    }
    return {
      path: newValue,
      range: new vscode.Range(textLine.lineNumber, start, textLine.lineNumber, end),
    };
  }
  private _tranformAliasPath(aliasPath: string) {
    let alias = this._configuration.alias;

    let aliasArr = aliasPath.split('/')
    for (let key of Object.keys(alias)) {
      if (key === aliasArr[0]) {
        let value = alias[key];
        if (!value.endsWith('/')) {
          value += '/';
        }
        return aliasPath.replace(key + '/', value);
      }
    }
  }
  private _getFileLocationFromPath(filePath: string) {
    let uri = vscode.Uri.file(filePath);
    let range = new vscode.Range(0, 0, 0, 0);
    let location = new vscode.Location(uri, range);
    return location;
  }
}