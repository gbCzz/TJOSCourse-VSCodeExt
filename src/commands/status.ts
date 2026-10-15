import * as vscode from 'vscode';

export function registerStatusCommand(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
  context.subscriptions.push(vscode.commands.registerCommand('tongjios.showStatus', () => {
    void vscode.window.showInformationMessage('TongjiOS 已激活');
    const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name ?? '(无工作区)';
    const editor = vscode.window.activeTextEditor;
    const fileName = editor?.document.fileName ?? '(无打开文件)';
    const language = editor?.document.languageId ?? '(未知语言)';

    output.appendLine(`[showStatus] ${new Date().toISOString()}`);
    output.appendLine(`工作区：${workspaceName}`);
    output.appendLine(`当前文件：${fileName}`);
    output.appendLine(`语言：${language}`);
    output.appendLine('---');
    output.show(true);
  }));
}
