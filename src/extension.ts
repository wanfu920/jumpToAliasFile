import * as vscode from 'vscode';
import Configuration from './Configuration';
import DefinitionProvider from './DefinitionProvider';

console.log('jumpToAliasFile extension start');
export function activate(context: vscode.ExtensionContext) {
    console.log('jumpToAliasFile extension activing');
    const configuration = new Configuration();
    const definitionProvider = new DefinitionProvider(configuration);
    const registerDefinitionProvider = vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: '**/*.{js,jsx,ts,tsx,vue}' }, definitionProvider);
    context.subscriptions.push(configuration);
    context.subscriptions.push(registerDefinitionProvider);
    console.log('jumpToAliasFile extension actived');
}
