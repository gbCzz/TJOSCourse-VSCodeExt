import * as vscode from 'vscode';
import { registerAuthCmd } from './commands/auth';
import { registerStatusCommand } from './commands/status';
import { AuthService } from './platform/authService';

export function activate(context: vscode.ExtensionContext) {
  // 创建输出窗口
  const output = vscode.window.createOutputChannel('TongjiOS');
  context.subscriptions.push(output);

  // 获取认证服务对象；该对象获取基本信息后尝试登录、存储认证信息或抛出错误
  const auth = new AuthService(context.secrets);

  // 发烟测试
  registerStatusCommand(context, output);

  // 用指定的登录服务对象登录课程平台
  registerAuthCmd(context, auth, output);
}

export function deactivate() {}

