import * as vscode from 'vscode';
import * as path from 'path';
import WebpackAliasSearcher from './WebpackAliasSearcher';

export default class Configuration {
  private _workspaceDir: string;
  private _configuration: vscode.WorkspaceConfiguration;
  private _listenConfigChangeDispose: { dispose(): any };
  private _webpackAliasSearcher: WebpackAliasSearcher;
  constructor() {
    this._workspaceDir = vscode.workspace.rootPath;
    this._syncConfiguration();
    this._listenConfigChange();
    this._webpackAliasSearcher = new WebpackAliasSearcher(this._workspaceDir);
    if (!Object.keys(this.alias).length) {
      // 不存在 alias 时, 走自动寻找 alias 策略
      let alias = this._webpackAliasSearcher.getDefaultAlias();
      this.alias = { ...this.alias, ...alias };
    }
  }

  private _syncConfiguration() {
    let oldWebpeckConfigPath: string;
    if (this._configuration) {
      oldWebpeckConfigPath = this._configuration.get('webpeckConfigPath');
    }
    this._configuration = vscode.workspace.getConfiguration('jumpToAliasFile', vscode.Uri.file(this._workspaceDir));
    let newWebpeckConfigPath: string = this._configuration.get('webpeckConfigPath');
    if (newWebpeckConfigPath && newWebpeckConfigPath !== oldWebpeckConfigPath) {
      // webpeckConfigPath 发生了变化, 读取 webpackConfig 文件中的 alias, 设置到 alias 中
      this._syncWebpeckConfigAlias(newWebpeckConfigPath);
    }
  }
  private _listenConfigChange() {
    this._listenConfigChangeDispose = vscode.workspace.onDidChangeConfiguration(this._syncConfiguration.bind(this));
  }
  private _syncWebpeckConfigAlias(webpeckConfigPath: string) {
    let webpackConfig: any;
    try {
      webpackConfig = require(path.join(this._workspaceDir, webpeckConfigPath));
    } catch (error) {

    }
    if (webpackConfig && webpackConfig.resolve && webpackConfig.resolve.alias && typeof webpackConfig.resolve.alias === 'object') {
      this.alias = { ...this.alias, ...webpackConfig.resolve.alias };
    }
  }
  get alias() {
    return this._configuration.get('alias') || {};
  }
  set alias(alias) {
    this._configuration.update('alias', alias);
  }
  dispose() {
    this._listenConfigChangeDispose.dispose();
  }
}