import * as vscode from 'vscode';
import { registerAuthCmd } from './commands/auth';
import { registerStatusCommand } from './commands/status';
import { AuthService } from './platform/authService';
import { getPlatformBaseUrl } from './config';
import { toPlatformError } from './platform/errors';

export async function activate(context: vscode.ExtensionContext) {
  // 创建输出窗口
  const output = vscode.window.createOutputChannel('TongjiOS');
  context.subscriptions.push(output);

  // 获取认证服务对象；该对象获取基本信息后尝试登录、存储认证信息或抛出错误
  const auth = new AuthService(context.secrets);

  const controller = new AbortController();
  context.subscriptions.push({
    dispose: () => controller.abort(),
  });

  // 发烟测试
  registerStatusCommand(context, output);

  // 首先尝试使用现有的会话
  let needLogin = false;
  try {
    const identity = await auth.restore(getPlatformBaseUrl(), controller.signal);

    if (identity === undefined) {
      output.appendLine('[auth] 无可用的会话，需要登录');
      needLogin = true;
    } else {
      output.appendLine('[auth] 已恢复登录状态');
      vscode.window.showInformationMessage(`已恢复登录状态：${identity.username} ${identity.displayName}`);
    }
  } catch (err) {
    const failure = toPlatformError(err);
    if (failure.code !== 'Cancelled') {
      output.appendLine(`[auth] 恢复会话失败：${failure.code}: ${failure.message}`);
    }
  }

  // 用指定的登录服务对象登录课程平台
  registerAuthCmd(context, auth, output);

  if (needLogin) {
    // 显示右下角弹窗并提供登录按键
    // 外层使用异步，避免阻塞扩展的后续激活流程
    void vscode.window
      .showInformationMessage('无可用的会话，需要登录', '登录')
      .then(async (res) => {
        if (res === '登录') {
          await vscode.commands.executeCommand('tongjios.login');
        }
      })
      .then(undefined, (error) => {
        const failure = toPlatformError(error);
        output.appendLine(`[auth] 打开登录失败：${failure.message}`);
      });
  }
}

export function deactivate() {}

