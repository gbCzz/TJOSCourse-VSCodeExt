# TJOSCourse-VSCodeExt
同济大学本科《操作系统》课程实验平台配套 VS Code 扩展。

当前处于开发预览阶段，已支持平台账号登录、身份核验与会话安全保存。

## 开发预览：命令登录

1. 执行 `npm run compile`，按 F5 打开 Extension Development Host。
2. 在该窗口的用户设置中搜索 `tongjios.platformUrl`，填写课程提供的实际 HTTPS 平台基址，可包含部署路径前缀，不要填写 `/api/auth/login` 或登录页面地址。当前实现会在配置为空时使用 https://vesper-center.gardilily.com；如需连接其他部署，请显式设置平台基址。
3. 在命令面板执行 **TJOS: 登录课程平台账号**，输入用户名和密码。用户名会去除首尾空格，密码保留原样并以掩码显示。
4. 扩展请求 `POST api/auth/login`，再携带 `os_session` Cookie 请求 `GET api/auth/me`。身份核验和安全存储均成功后显示登录成功。
5. 在“输出 → TongjiOS”查看脱敏结果；**TJOS: 检查状态**仍可检查扩展、工作区与当前编辑器。

会话按平台基址保存在 VS Code SecretStorage 中，不保存密码，不把返回的 token 当成 Bearer 凭据。支持取消、15 秒单请求超时；登录请求不自动重试，也不自动跟随重定向。平台地址为用户级设置，工作区不能覆盖。当前范围为手动登录与会话保存，自动恢复和退出命令尚未实现。

代码分工：`extension.ts` 组装依赖；`commands/` 负责 VS Code 交互；`platform/authClient.ts` 负责认证 HTTP、Cookie 和响应校验；`platform/authService.ts` 负责核验后保存；`platform/errors.ts` 定义可安全展示的错误。

验证：`npm run test:unit` 运行离线认证测试，`npm run lint` 检查代码；`npm test` 使用 Extension Host 运行测试。离线模拟响应不代表真实平台联调通过，需要在开发宿主手动验证成功登录、错误密码及取消。

## 当前功能

- 检查扩展激活状态、当前工作区和编辑器信息。
- 手动登录课程平台，并通过身份接口核验用户。
- 使用 VS Code SecretStorage 保存会话，不保存密码。
- 支持登录取消、请求超时和脱敏错误提示。

## 环境要求

- VS Code 1.138.0 或更高版本。
- 可访问课程平台的网络环境及有效账号。

## 扩展设置

`tongjios.platformUrl`：平台 HTTPS 基址，支持部署路径前缀。
此设置为应用级配置，工作区不能覆盖。

## 当前限制

- 会话已经保存，但尚不支持重启后恢复或退出登录。
- “检查状态”暂不显示账号认证状态。
- 尚不支持仓库浏览、文件下载、同步、终端及调试。

## 更新记录

参见 [CHANGELOG.md](CHANGELOG.md)。