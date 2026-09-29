import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "tongjios" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  const output = vscode.window.createOutputChannel('TongjiOS');

  const showStatusCommand = vscode.commands.registerCommand('tongjios.showStatus', () => {
    vscode.window.showInformationMessage('TongjiOS 已激活');

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
  });

  context.subscriptions.push(showStatusCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}

