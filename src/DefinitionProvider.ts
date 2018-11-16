import * as vscode from 'vscode';
import * as path from 'path';
import Configuration from './Configuration';
import { fixFilePathExtension, extractImportPathFromTextLine, getFileZeroLocationFromFilePath } from './util';

export default class DefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly _configuration: Configuration) {
  }
  provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition> {
    return this._getFileRealPosition(document, position);
  }
  private async _getFileRealPosition(document: vscode.TextDocument, position: vscode.Position) {
    const textLine = document.lineAt(position)
    const pathObj = extractImportPathFromTextLine(textLine);

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
      return getFileZeroLocationFromFilePath(realFilePath)
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
}