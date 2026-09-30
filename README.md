# TJOSCourse-VSCodeExt
An extension on VS Code about Tongji OS Course of undergruated CS/DS/IS

## 开发预览：命令登录

1. 执行 `npm run compile`，按 F5 打开 Extension Development Host。
2. 在该窗口的用户设置中搜索 `tongjios.platformUrl`，填写课程提供的实际 HTTPS 平台基址，可包含部署路径前缀，不要填写 `/api/auth/login` 或登录页面地址。
3. 在命令面板执行 **TJOS: 登录课程平台账号**，输入用户名和密码。用户名会去除首尾空格，密码保留原样并以掩码显示。
4. 扩展请求 `POST api/auth/login`，再携带 `os_session` Cookie 请求 `GET api/auth/me`。身份核验和安全存储均成功后显示登录成功。
5. 在“输出 → TongjiOS”查看脱敏结果；**TJOS: 检查状态**仍可检查扩展、工作区与当前编辑器。

会话按平台基址保存在 VS Code SecretStorage 中，不保存密码，不把返回的 token 当成 Bearer 凭据。支持取消、15 秒单请求超时；登录请求不自动重试，也不自动跟随重定向。平台地址为用户级设置，工作区不能覆盖。当前范围为手动登录与会话保存，自动恢复和退出命令尚未实现。

代码分工：`extension.ts` 组装依赖；`commands/` 负责 VS Code 交互；`platform/authClient.ts` 负责认证 HTTP、Cookie 和响应校验；`platform/authService.ts` 负责核验后保存；`platform/errors.ts` 定义可安全展示的错误。

验证：`npm run test:unit` 运行离线认证测试，`npm run lint` 检查代码；`npm test` 使用 Extension Host 运行测试。离线模拟响应不代表真实平台联调通过，需要在开发宿主手动验证成功登录、错误密码及取消。

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
