import * as fs from 'fs';
import * as path from 'path';

const excludePaths = ['test', 'node_modules'];
/**
 * 自动寻找 webpack alias 算法
 *
 * 1. 确定当前工作目录使用到了 webpack
 *
 * 先寻找项目目录中 package.json
 *  仅搜寻当前目录和次级目录下的 package.json
 * 遍历 package.json 中的 script, 找出 webpack 命令使用到的 config 文件
 * 如果没有找到 webpack config 文件, 启用搜寻当前目录下的所有 webpack 开发的文件, 提取出 alias
 */
export default class WebpackAliasSearcher {
  private _projects: Map<string, { pkg: any }> = new Map();
  constructor(private readonly _workspaceDir: string) {
    try {
      const rootWorkspacePackagePath = path.join(this._workspaceDir, 'package.json');
      if (fs.existsSync(rootWorkspacePackagePath)) {
        this._setProject(rootWorkspacePackagePath);
      } else {
        const files = fs.readdirSync(this._workspaceDir).filter(f => {
          if (excludePaths.indexOf(f) > -1) return false;
          if (f.includes('.')) return false;
          return true;
        });
        for (let file of files) {
          const subWorkspacePackagePath = path.join(this._workspaceDir, file, 'package.json');
          if (fs.existsSync(subWorkspacePackagePath)) {
            this._setProject(subWorkspacePackagePath);
          }
        }
      }
    } catch (error) {
    }
  }
  private _setProject(pkgPath: string) {
    let pkg = require(pkgPath);
    if (
      (pkg.dependencies && pkg.dependencies.webpack) ||
      (pkg.devDependencies && pkg.devDependencies.webpack)
    ) {
      this._projects.set(path.join(pkgPath, '../'), { pkg });
    }
  }
  getDefaultAlias() {
    let alias: any = {};
    try {
      if (this._projects.size) {
        let webpackConfigPaths = this._getWebpackConfigPathsFromPackage();
        webpackConfigPaths.push(...this._getWebpackConfigsFromFileSearch());
        let webpackConfigs = this._getWebpackConfigs(webpackConfigPaths);
        if (webpackConfigs.length) {
          alias = this._getAliasFromWebpackConfigs(webpackConfigs);
        }
      }
    } catch (error) {
    }
    return alias;
  }
  private _getWebpackConfigs(webpackConfigPaths: string[]) {
    webpackConfigPaths = [...new Set(webpackConfigPaths)];
    let webpackConfigs: any[] = [];
    for (let webpackConfigPath of webpackConfigPaths) {
      try {
        const webpackConfig = require(webpackConfigPath);
        if (webpackConfig) {
          webpackConfigs.push(webpackConfig);
        }
      } catch (error) {
      }
    }
    return webpackConfigs;
  }
  private _getWebpackConfigPathsFromPackage() {
    let webpackConfigPaths: string[] = [];
    for(let [projectDir, { pkg }] of this._projects) {
      for (let key of Object.keys(pkg.scripts || {})) {
        const script = pkg.scripts[key];
        let webpackConfigPath = this._getWebpackConfigPathsFromScript(script, projectDir);
        if (webpackConfigPath) {
          webpackConfigPaths.push(webpackConfigPath);
        }
      }
    }
    return webpackConfigPaths;
  }
  private _getWebpackConfigPathsFromScript(script: string, projectDir: string) {
    let tokens = script.split(' ').filter(t => t);
    const webpackIndex = tokens.indexOf('webpack');
    if (webpackIndex > -1) {
      let webpackConfigPath: string;
      const configIndex = tokens.indexOf('--config');
      if (configIndex > webpackIndex && configIndex < tokens.length - 1) {
        webpackConfigPath = tokens[configIndex + 1];
      } else {
        webpackConfigPath = './webpack.config.js';
      }
      webpackConfigPath = path.join(projectDir, webpackConfigPath);
      return webpackConfigPath;
    }
  }
  private _getAliasFromWebpackConfigs(webpackConfigs: any[]) {
    let alias = {};
    for(let webpackConfig of webpackConfigs) {
      if (webpackConfig.resolve && webpackConfig.resolve.alias && typeof webpackConfig.resolve.alias === 'object') {
        Object.assign(alias, webpackConfig.resolve.alias);
      }
    }
    return alias;
  }
  private _getWebpackConfigsFromFileSearch() {
    let webpackConfigPaths: string[] = [];
    for(let [projectDir, { pkg }] of this._projects) {
      let webpackConfigPath = this._traverseGetWebpackConfigsFromFileSearch(projectDir);
      if (webpackConfigPath.length) {
        webpackConfigPaths.push(...webpackConfigPath);
      }
    }
    return webpackConfigPaths;
  }
  private _traverseGetWebpackConfigsFromFileSearch(filePath: string, deep = 1, maxDeep = 5) {
    if (deep > maxDeep) {
      return [];
    }
    if (!fs.statSync(filePath).isDirectory()) return [];

    // 去除 node_modules test 文件夹, 非 .js 后缀文件, 以及 .开头文件
    let files = fs.readdirSync(filePath)
      .filter(t => {
        excludePaths.indexOf(t) === -1 || t.endsWith('.js') || !t.startsWith('.')
        if (excludePaths.indexOf(t) > -1) return false;
        if (t.includes('.')) {
          if (t.startsWith('.')) return false;
          if (!t.endsWith('.js')) return false;
        }
        return true;
      });
    let dirs = files.filter(t => !t.endsWith('.js'));
    files = files.filter(t => t.endsWith('.js'));

    let webpackConfigPaths: string[] = [];
    for (let file of files) {
      let webpackConfigPath = this._getWebpackConfigFromFilePath(path.join(filePath, file));
      if (webpackConfigPath) {
        webpackConfigPaths.push(webpackConfigPath);
      }
    }

    for(let dir of dirs) {
      let subWebpackConfigPaths = this._traverseGetWebpackConfigsFromFileSearch(path.join(filePath, dir), deep + 1);
      webpackConfigPaths.push(...subWebpackConfigPaths);
    }
    return webpackConfigPaths;
  }
  private _getWebpackConfigFromFilePath(filePath: string) {
    const tokens = filePath.split('/');
    const fileName = tokens[tokens.length - 1];
    if (/^webpack\..*\.js$/.test(fileName)) {
      return filePath;
    }
  }
}