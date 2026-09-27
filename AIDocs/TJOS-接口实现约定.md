# TJOS-VSCodeExt 接口实现约定 v0.1

日期：2026-09-27。配套《TJOS-HTTP接口观测合同.md》提供 14 份 HAR、2,616 条 HTTP 中筛选出的 43 个方法/路径组合及可定位证据。本文件规定客户端如何使用这些观测，不把客户端设计当成服务端保证。WebSocket 依据 captures 的 websocket.jsonl。未经在线重放或扩展宿主联调。

## 1. 证据与能力边界

- **已观测**：抓包存在请求/响应；HTTP 200 仍须检查 ok。
- **客户端设计**：本文件的队列、缓存、状态机、重试与 DAP 映射。
- **待验证**：服务端生命周期、并发、条件写、版本绑定、客户端兼容。
- 首版支持 Windows 本机 VS Code 桌面扩展、API 同步模式。无独立 CLI、常驻服务、Code-OSS 分叉。原生 Git 模式仅在凭据与权限确认后启用。
- 仓库重命名 `/api/admin/repo-update` 已返回 403，学生模式不提供可执行入口。文件重命名是另一个未验证能力，不用“创建+删除”暗中模拟。

## 2. HTTP、认证和错误模型

平台基址统一配置；路径和 Query 由 URL API 编码。生产客户端验证 TLS，使用可信 CA，不继承临时跳过证书的调研脚本。设置超时、取消与有界正文；不要把 HAR 的 HTTP/2 伪首部复制到客户端。

已观察认证：POST `/api/auth/login` 的 JSON 为 username/password；响应含身份字段，部分样本含 token。浏览器设置 os_session Cookie：HttpOnly、Secure、SameSite=Strict、Max-Age=2592000。新增项目 HAR 有 GET `/api/auth/me` 成功响应，含 ok/username/role/display_name/is_teacher。POST logout 有成功空正文及清除 Cookie 的证据。

设计流程：首次登录→维护独立 Cookie jar→调用 me 核验→恢复工作区；重启后尝试恢复凭据并调用 me；401 清除失效认证并暂停依赖操作；退出先请求 logout，再清理本地凭据与账号关联缓存。服务端退出失败时明确提示远端撤销未确认。长期秘密仅存 VS Code SecretStorage，密码默认不保存；token 的用途未核验，不自行假设 Bearer 认证。Cookie 声明的 30 天不等于服务端生命周期保证。

统一错误分类：Network、TLS、Timeout、Cancelled、Unauthorized、Forbidden、NotFound、Conflict（仅明确的冲突证据）、Busy、InvalidState、Protocol、Server。保留 HTTP 状态、业务错误和请求关联 ID；对用户输出不带 Cookie、令牌、密码、原始终端输入或私有正文。HTML 替代 JSON 属于协议/认证待诊断状态，不直接定性成登录过期。

查询可有限退避重试；业务错误按端点解释。save/create/delete/git-pull/connect/cmd/submit 等状态变更不自动重放：超时意味着结果未知，先核对状态。logout、vm/stop 等已见空正文端点单独允许空响应；CSV 索引不强制套用 JSON 解码。

## 3. 工作区与同步

| 调用 | 观测与消费规则 |
|---|---|
| GET student/repos | ok/my_repos/excellent_repos/public_repos/base_repos；分类含义保留，不把所有可见库当可写库。repo 元数据字段见合同 |
| GET lab/tree?repo=… | ok/tree；节点含 name/type/path/size/children。全树下载需验证是否完整、是否分页；严格校验路径越界、重复与大小写冲突 |
| GET lab/file?repo=…&path=… | ok/path/name/size/sha/content；内容编码和大文件支持尚未系统验证；sha 作为远端不透明版本标识 |
| POST lab/save | repo/path/content → ok/path/sha；所见请求没有 expected_sha，存在检查后写入的竞争窗口 |
| POST lab/file/create | repo/path/content/message → ok/path/repo/sha |
| POST lab/file/delete | repo/path/sha/message → ok/path/repo；请求携带 SHA，但服务端是否强制条件校验待测 |
| POST lab/diff-cache | repo/ref_repo → 增删改计数、diffs、缓存时间等；对照参考代码的差异，不能替代本地-基线-远端三方同步 |

设计：基线 B、本地 L、远端 R。下载建立 B；上传前重新读取 R；B≠R 且本地变更时展示冲突；上传成功后回读确认再更新 B。多文件逐项记录 pending/applied/verified/unknown/failed；所有必要文件 verified 前禁止自动构建。没有服务端条件写或原子批量操作时，明确单端编辑限制和剩余竞争窗口，不能宣称完全消除覆盖。

错误/断网后不删除本地修改。删除单独预览，区分本地删除、平台删除与 Git 提交。save 返回 sha 不证明原生 Git push、分支控制或原子提交。未知编码/二进制先只读。

## 4. 容器、终端与 VNC

POST container/ensure 使用 username/repo，返回 ok/ws_port/vnc_port/container/status/work_dir/term_token/term_gate_port。username 来自核验身份，不允许任意输入他人身份。POST container/git-pull 使用 username/repo，返回 ok/output/repo/switched/prev_repo；不能仅因名为 git-pull 就假定不会 reset/clean。

观测连接路径：`wss://{platform}/wsproxy/{gatewayPort}/{token}`；VNC 为该路径追加 `/vnc`。端口与令牌取平台返回值。握手首部、Origin 检查、令牌时限/续期、连接上限尚未验证；WS 的 open 事件本身不提供完整握手合同。

终端文本帧形态（示意值为人工编写）：

```json
{"type":"input","data":"<user input>"}
{"type":"resize","cols":80,"rows":24}
{"type":"ready","pid":1,"cwd":"<remote work directory>"}
{"type":"data","data":"<terminal output>"}
```

前两种为发送，后两种为接收。记录的 utf-8/base64、direction、socket_id 是录制文件元数据，不属于线上协议。VNC Base64 是录制表示，实际为二进制帧；noVNC 接入时使用二进制，不能把 Base64 字符串直接发送给服务器。

终端状态：disconnected→acquiring→connecting→ready→lost/expired→closed；断线不重放输入。ready 只表示终端可用，不表示编译完成。Build/Clean/Run/Debug 的实际命令取实验配置；自动构建任务必须先验证唯一完成标记、退出码、取消语义，否则只提供手动终端。输出有界缓冲、正确处理 ANSI 和拆分帧。

VNC 在独立 Webview 按需打开，验证短期凭据和 Origin；若不兼容，提供网页入口。严禁将主会话凭据暴露给 Webview。连接失败不能直接推断 QEMU 已停止。vm/stop、capture 有样本，截图 data 编码应在实现该可选功能前细化，不以录制成功代替格式规范。

## 5. 调试与教学数据

| DAP/面板能力（客户端设计） | 平台观测 | 启用条件 |
|---|---|---|
| attach/disconnect | debug/connect {target,repo}；disconnect | 不在未知状态自动启动/重置目标；断开是否停止目标需联调 |
| continue/pause | cmd action=continue/interrupt | 以状态确认运行/停止，不能仅收到命令成功就合成停止位置 |
| stepIn/stepOut | cmd action=step/finish | 有成功及失败样本；函数边界不可用时返回真实错误 |
| 指令单步 | stepi/nexti | 已有成功样本；根据可用粒度声明支持 |
| 源码 next | 未见 action=next 样本 | 未验证前不把 nexti 冒充源码步过；先明确不支持此粒度 |
| setBreakpoints | {repo,file,breakpoints:[行号…]} | 观测为完整集合，含空集合清除；按响应核对；实际命中/符号版本仍需联调 |
| stack/scopes/variables | stack、state.locals、eval.members | 从真实结构映射 frame/variable handles，缺失字段不伪造；复杂/非空结构另做脱敏 fixture |
| evaluate | eval?expr=… | 已见成功及成员不存在错误；用户输入表达式可能有副作用，不自动求值未知表达式 |
| readMemory/disassemble | memory 的 addr/count/fmt/phys/unit；disasm 的 full/syntax | 先校验地址、单位、长度与返回结构；数据字段与 Query 并集见合同 |
| MMU/文件系统 | lab-report?type=…，以及地址/范围 Query | 已见 mmu 成功和 fs 空态；非空 inode 尚未形成合同 |

所有 GDB 操作进入同一串行调度器；Busy 不触发盲目重放。使用 sessionGeneration、stopGeneration 拒绝迟到响应；暂停视图共享同一代快照。可见时有界轮询，运行时停止无效的寄存器/教学查询。state 的 vm_running 与 connected 等语义须联合实测，不猜测 stopped 事件。

已见限制：运行中不得读取某些教学报告；用户态不支持进程/MMU 卡片；无监听目标不能连接；GDB 忙、函数边界缺失和寄存器读取失败可能表现为 HTTP 200 + ok=false。fs 返回 ok=true、fs_count=0、inodes=[] 时显示真实空态。

## 6. 参考分析及范围外调用

code-index 是 CSV，使用正确 CSV 解析与数据摘要缓存；resolve-path 有成功及 500/404 包装失败，处理路径前缀差异。参考版本未知时标记“参考图谱”，不替代实时语言服务。code-annotations、kg/associations 等首版只读。

fork/submit 已有正常样本但不纳入首个版本的自动工作流；提交留网页。analytics/heartbeat 的存在不能证明课程方认可插件学习记录，未确认前不模拟时长或网页点击。help-docs、assignments 等可作为附属入口，核心开发不依赖完整课程站点重建。

## 7. 下一步合同维护

实现某端点时，从原始定位样本提取并脱敏非空嵌套响应，固定在契约测试中；验证字段类型、缺字段、空数组、业务错误和 HTML 响应。当前自动清单只提供顶层字段并集，不是可直接生成 SDK 的 OpenAPI，也没有把有限样本推导成所有字段必填。

维护状态：observed / fixture-ready / host-verified / enabled。只有 host-verified 且阶段验收通过才进入 enabled。认证、令牌、同步一致性和构建完成判定是首批联调项目。
