# jump-to-alias-file

可以对 webpack 别名路径或者自定义别名路径进行快速跳转的插件.

![Sample](https://raw.githubusercontent.com/wanfu920/jumpToAliasFile/master/demo.gif)


### Configuration
如果使用的是 webpack 别名路径, 99% 的情况不需要做任何设置, 插件可以智能的识别出 webpack alias, 并进行自动设置.
- alias: 别名路径映射, 路径为绝对路径
```
"jumpToAliasFile.alias": {
  "@": "/Users/xxx/project/src",
}
```
- webpeckConfigPath: webpack config 文件路径, 路径可以为绝对路径或者相对路径(相对项目根目录)
```
"jumpToAliasFile.webpeckConfigPath": "./webpack.config.json"
```

### FAQ