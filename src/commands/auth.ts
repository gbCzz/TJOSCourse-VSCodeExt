import * as vscode from 'vscode';
import { AuthService } from '../platform/authService';
import { normalizeBaseUrl } from '../platform/authClient';
import { toPlatformError } from '../platform/errors';

/**
 * 注册命令：平台登录相关
 * @param context 扩展上下文
 * @param auth 用于登录的认证服务对象，用于执行认证业务
 * @param output 指定输出窗口
 */
export function registerAuthCmd(context: vscode.ExtensionContext, auth: AuthService, output: vscode.OutputChannel) {
  // 此处的变量会在同一命令的多次调用间共享
  // busy 标记重复触发
  let busy = false;
  let activeRequest: AbortController | undefined;

  context.subscriptions.push({ dispose: () => activeRequest?.abort() });
  context.subscriptions.push(
    // 注册 login 命令，在回调函数中定义 login 的行为
    vscode.commands.registerCommand('tongjios.login', async () => {
      if (busy) {
        void vscode.window.showInformationMessage('登录正在进行，请完成当前登录操作。');
        return;
      }
      busy = true;
      try {
        // 获取课程平台 URL
        let configuredUrl = vscode.workspace.getConfiguration('tongjios').get<string>('platformUrl', '');
        if (!configuredUrl.trim()) {
          configuredUrl = 'https://vesper-center.gardilily.com';
        }
        const baseUrl = normalizeBaseUrl(configuredUrl);

        // 用户名（学号）输入
        const username = await vscode.window.showInputBox({
          title: '登录同济大学操作系统课程平台（1/2）',
          prompt: `请输入用户名 · ${baseUrl}`,
          ignoreFocusOut: true,

          // validateInput 需要一个给定验证输入有效性的函数
          validateInput: (value) => (value.trim() ? undefined : '用户名不能为空'),
        });
        if (username === undefined) {
          return;
        }

        // 密码输入
        const password = await vscode.window.showInputBox({
          title: '登录同济大学操作系统课程平台（2/2）',
          prompt: '请输入密码（不保存）',
          password: true,
          ignoreFocusOut: true,
          validateInput: (value) => (value.length ? undefined : '密码不能为空'),
        });
        if (password === undefined) {
          return;
        }

		// 开始联网登录
        const identity = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: '正在登录课程平台并核验身份…',
            cancellable: true,
          },
		  // 回调代表这次登录的具体任务
          async (_progress, token) => {
			// controller 用于给当前回调函数发出取消指令，将 controller.signal 传递给其他过程
            const controller = new AbortController();
            activeRequest = controller;

			// 监听器，当用户要求取消时，执行后面的回调函数。此处是调用 controller.abort
            const cancellation = token.onCancellationRequested(() => controller.abort());

			// 并且立刻检查一次当前状态
            if (token.isCancellationRequested) {
              controller.abort();
            }
            try {
              return await auth.login(baseUrl, username.trim(), password, controller.signal);
            } finally {
			  // 任务结束取消监听
              cancellation.dispose();
              activeRequest = undefined;
            }
          },
        );

		// 如果成功，正常输出结果；登陆失败转到 catch 处理
        output.appendLine(`[login] ${new Date().toISOString()} 身份核验成功，会话已保存。`);
        void vscode.window.showInformationMessage(`课程平台登录成功：${identity.username}`);
      } catch (error) {
        const failure = toPlatformError(error);
        output.appendLine(
          `[login] ${failure.code}${failure.status ? ` HTTP ${failure.status}` : ''}: ${failure.message}`,
        );
        if (failure.code !== 'Cancelled') {
          void vscode.window.showErrorMessage(failure.message);
        }
      } finally {
        busy = false;
      }
    }),
  );
}

