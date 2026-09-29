# TJOS HTTP API 文档（观测草案）

版本：0.1；整理日期：2026-09-29；证据日期：2026-09-27。

本文依据 [HTTP 接口观测合同](TJOS-HTTP接口观测合同.md) 的 43 个方法/路径组合及 [接口实现约定](TJOS-接口实现约定.md) 整理。原合同保留 14 份 HAR 的来源哈希和样本定位。本文不是服务端正式规范；本次未访问平台、未重放请求。当前认证命令代码为空，没有补充实现证据。

## 1. 通用约定

- **已观测**：下文参数、响应字段、MIME、HTTP 状态和业务计数来自合同。字段是样本并集，可能混合成功、失败和不同模式，不能当成完整单次响应。
- **用途推断**：接口中文用途和常见字段解释根据命名及场景整理，不作为服务端保证。
- **客户端建议**：认证流程、同步与重试策略来自实现约定，不是服务端强制流程。
- **待确认**：除明确注明外，字段类型、必填性、可空性、默认值、枚举、长度及嵌套结构均未形成完整合同。客户端应容忍缺字段、null 和未知枚举。

`BASE_URL` 为配置的平台基址；文中路径相对此基址。域名、部署前缀、版本策略和环境区分待确认。客户端验证 TLS，并通过 URL API 编码路径参数和 Query。`{assignment}`、`{document}` 是路径占位符，标识格式未知。

“未观察到”不等于禁止参数或正文，也不等于必须发送空对象。请求 MIME 空白统一记为“未记录”。`_`、`_t` 可能用于缓存规避，仅为推断，是否必传及值格式未知。

### 1.1 常见参数说明（语义推断）

| 字段 | 可能含义与边界 |
|---|---|
| repo / ref_repo / source | 目标仓库 / 参考仓库 / 派生来源；标识格式与权限待确认 |
| path / file | 仓库路径 / 调试源码路径；不能假设是任意服务器绝对路径或相同路径空间 |
| content | 文件内容；编码、二进制及大小限制待确认 |
| sha | 远端不透明版本标识，不代表服务端保证条件写 |
| message | 操作说明，可能为提交信息；Git 提交语义待确认 |
| assignment / assignment_id | 实验标识；不同端点的格式是否一致待确认 |
| student / username | 学生或账号标识；存在该字段不代表允许操作他人数据 |
| target / current | 调试目标及当前目标；允许值和结构待确认 |
| error / msg / message / warning | 错误、说明或警告；结构及稳定错误码未知 |

### 1.2 认证

实现约定记录：登录使用 JSON 字段 `username/password`；浏览器设置 `os_session` Cookie，属性为 `HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`。部分登录响应含 `token`，用途未核验，不能假定采用 Bearer 认证。Cookie 声明的 30 天不等于服务端有效期保证。

客户端建议：登录 → 维护独立 Cookie jar → 调用 `GET /api/auth/me` 核验身份 → 使用私有接口。恢复凭据后也先核验；401 后清理失效认证并暂停依赖操作。退出先请求 logout，再清理本地凭据；远端失败时标记撤销未确认。精确鉴权、CSRF、续期和扩展宿主兼容性待验证。

### 1.3 响应与错误

多数接口返回 JSON，但 PDF、CSV、HTML 和空正文应按端点单独解析。HTTP 200 仍可能 `ok=false`；缺失 `ok` 时不能自行补成成功或失败。计数不提供 HTTP 状态与业务正文的一一对应关系。

| 已观测状态或形式 | 端点及解释边界 |
|---|---|
| 200 + ok=false | eval、lab-report、stack、cmd、connect 等存在业务失败 |
| 401 | login、assignments；部分响应可能没有 ok |
| 403 | admin/repo-update 只有拒绝样本，不能证明更新成功行为 |
| 404 | file；更细的原因分类待确认 |
| 400 | diff-cache；请求失败细节待提取 |
| 500 | resolve-path；实现约定提及 404 包装失败，不据此新增 HTTP 404 状态 |
| 空正文 | logout 有成功空正文，vm/stop 既有 JSON 又有空正文 |

预期 JSON 却收到 HTML 应诊断协议/认证问题，不能直接断言登录过期；帮助文档的 HTML 则是已观测格式。普通查询可有限退避，求值等可能有副作用的 GET 不盲目重试。状态变更超时表示结果未知，应核对状态，不自动重放。分页、限流、幂等键、ETag、事务和统一错误码尚未确认。

## 2. 接口明细

按功能分组。用途是语义整理，表格是原始观测；“证据”中的索引为 HAR `log.entries` 的零基索引。完整来源哈希见原合同。

### 认证与身份

#### POST /api/auth/login

登录；身份字段可能缺失，token 用途未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 13；HTTP 状态：200, 401；JSON ok=true：12，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | password, username |
| JSON 响应顶层字段 | avatar_url, error, full_name, is_ta, is_teacher, must_change_password, ok, role, token, username |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “代码分析” 基本操作 entries[81]；运行、启动虚拟机、与虚拟机系统交互 entries[86] |

#### GET /api/auth/me

查询当前身份；display_name 与登录 full_name 不应直接视为同一字段。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：1，ok=false：0 |
| Query 字段 | _ |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | display_name, is_teacher, ok, role, username |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 在登录后的首页刷新.har entries[47] |

#### POST /api/auth/logout

退出登录；允许成功空正文，已记录清除 Cookie。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：0，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | 未观察到 JSON 对象；检查正文格式/空响应 |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 登录与登出 entries[87] |

### 仓库与文件

#### GET /api/student/repos

查询可见仓库；保留四种分类，可见不等于可写。仓库条目结构未展开。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 23；HTTP 状态：200；JSON ok=true：23，ok=false：0 |
| Query 字段 | _t |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | base_repos, excellent_repos, my_repos, ok, public_repos |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[97] |

#### GET /api/lab/tree

获取文件树；实现约定补充节点 name/type/path/size/children，完整性和分页待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 19；HTTP 状态：200；JSON ok=true：19，ok=false：0 |
| Query 字段 | repo |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | ok, tree |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[139] |

#### GET /api/lab/file

读取文件；内容编码及大小限制待确认，404 正文可能没有 ok。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 19；HTTP 状态：200, 404；JSON ok=true：18，ok=false：0 |
| Query 字段 | path, repo |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | content, error, is_fork, name, ok, path, repo, repo_parent, sha, size |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[156]；虚拟机截图、虚拟机重启、生成实验报告模板 entries[398] |

#### GET /api/lab/lock-state

查询锁定状态；locked/state 与可写性的确切关系及锁生命周期未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 18；HTTP 状态：200；JSON ok=true：18，ok=false：0 |
| Query 字段 | repo |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | assignment_id, locked, ok, state |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[138] |

#### GET /api/lab/resolve-path

解析路径；可能用于参考索引的路径映射，前缀处理和失败原因待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 8；HTTP 状态：200, 500；JSON ok=true：1，ok=false：7 |
| Query 字段 | path, repo |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | error, ok, original, resolved_path |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 实验平台可视化分析 entries[124]；“代码分析” 基本操作 entries[88] |

#### POST /api/lab/save

保存文件；未观察到 expected_sha，不保证条件写或新文件创建，建议保存后回读。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 8；HTTP 状态：200；JSON ok=true：8，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | content, path, repo |
| JSON 响应顶层字段 | ok, path, sha |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 开始实验、修改文件、diff、删除文件 entries[134] |

#### POST /api/lab/file/create

创建文件；重名覆盖、父目录创建及 Git 提交语义未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：1，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | content, message, path, repo |
| JSON 响应顶层字段 | ok, path, repo, sha |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 虚拟机截图、虚拟机重启、生成实验报告模板 entries[399] |

#### POST /api/lab/file/delete

删除文件；请求带 sha，但是否强制校验版本未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 2；HTTP 状态：200；JSON ok=true：2，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | message, path, repo, sha |
| JSON 响应顶层字段 | ok, path, repo |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 开始实验、修改文件、diff、删除文件 entries[159] |

#### POST /api/lab/diff-cache

获取参考仓库差异；缓存期限和计数口径未知，不能替代本地三方同步。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 12；HTTP 状态：200, 400；JSON ok=true：6，ok=false：6 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | ref_repo, repo |
| JSON 响应顶层字段 | cached_at, diffs, error, files_added, files_deleted, files_modified, ok, ref_repo, repo, sha_mismatch_candidates, student_repo, total_files |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 开始实验、修改文件、diff、删除文件 entries[123]；打开代码库，编辑文件，保存 entries[139] |

### 课程与实验

#### GET /api/lab/assignments

查询实验列表；assignments/class_totals 嵌套结构未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 44；HTTP 状态：200, 401；JSON ok=true：31，ok=false：13 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | assignments, class_totals, error, ok |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[96]；“代码分析” 基本操作 entries[44] |

#### GET /api/lab/assignments/{assignment}/sections

查询实验章节；sections 结构和 guide_filename 含义待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：1，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | guide_filename, name, ok, sections |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[146] |

#### GET /api/lab/assignments/{assignment}/guide

获取指导文档；按 PDF 二进制处理，不解析为 JSON。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：0，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | 未观察到 JSON 对象；检查正文格式/空响应 |
| 请求 MIME | 未记录 |
| 响应 MIME | application/pdf |
| 证据 | “实验平台” 基本操作 entries[147] |

#### GET /api/lab/submissions

查询提交记录；assignment/student 可能为筛选项，可选性、权限及分页未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 10；HTTP 状态：200；JSON ok=true：10，ok=false：0 |
| Query 字段 | assignment, student |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | ok, submissions |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[112] |

#### POST /api/lab/fork

派生实验仓库；来源、目标命名规则及重复请求行为未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：1，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | assignment_id, source, target_name |
| JSON 响应顶层字段 | full_name, ok, target_name |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 开始实验、修改文件、diff、删除文件 entries[113] |

#### POST /api/lab/submit

提交实验记录；status 枚举、是否终态及是否锁定仓库未知，不自动重放。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：1，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | assignment_id, repo, status, student |
| JSON 响应顶层字段 | ok, submission |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 开始实验、修改文件、diff、删除文件 entries[114] |

#### GET /api/lab/help-docs

查询帮助文档；条目结构和 document 标识来源待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 2；HTTP 状态：200；JSON ok=true：2，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | docs, ok |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[114] |

#### GET /api/lab/help-docs/{document}/view

查看帮助文档；按 HTML 处理。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：0，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | 未观察到 JSON 对象；检查正文格式/空响应 |
| 请求 MIME | 未记录 |
| 响应 MIME | text/html; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[129] |

### 容器与虚拟机

#### POST /api/lab/container/ensure

准备或获取容器；username 来自核验身份，创建/复用和持久化规则未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 26；HTTP 状态：200；JSON ok=true：26，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | repo, username |
| JSON 响应顶层字段 | container, ok, status, term_gate_port, term_token, vnc_port, work_dir, ws_port |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[98] |

#### POST /api/lab/container/git-pull

同步容器仓库；不能因接口名假定不会 reset/clean 或覆盖工作区。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 11；HTTP 状态：200；JSON ok=true：11，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | repo, username |
| JSON 响应顶层字段 | ok, output, prev_repo, repo, switched |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[111] |

#### POST /api/lab/vm/stop

停止虚拟机；存在 JSON 和空正文，停止完成和重复停止语义待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 3；HTTP 状态：200；JSON ok=true：2，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | message, ok |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 虚拟机截图、虚拟机重启、生成实验报告模板 entries[280]；编译、清理、调试 echo、简单交互 entries[231] |

#### POST /api/lab/capture

保存捕获内容；data 编码、kind 枚举及落盘规则未知，不假定为 Base64 或 data URL。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 1；HTTP 状态：200；JSON ok=true：1，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | data, kind, name, repo |
| JSON 响应顶层字段 | kind, ok, path, size |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 虚拟机截图、虚拟机重启、生成实验报告模板 entries[277] |

### 调试控制

#### GET /api/lab/debug/targets

查询调试目标；targets/current/hint 结构待确认，不硬编码目标名称。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 97；HTTP 状态：200；JSON ok=true：97，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | current, hint, ok, targets |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[105] |

#### GET /api/lab/debug/status

查询调试状态；connected/vm_running/cleaned 的关联未知，不直接推定停止事件。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 101；HTTP 状态：200；JSON ok=true：101，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | cleaned, connected, ok, target, vm_running |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “实验平台” 基本操作 entries[141] |

#### POST /api/lab/debug/connect

连接调试目标；无监听目标可能失败，成功不保证后续查询可用。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 4；HTTP 状态：200；JSON ok=true：3，ok=false：1 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | repo, target |
| JSON 响应顶层字段 | eip, error, msg, ok, stopped, warning |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[108]；步操控、mmu、文件系统、求值、断点 entries[175] |

#### POST /api/lab/debug/disconnect

断开调试连接；是否同时停止目标未知，请求正文未观察到。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 3；HTTP 状态：200；JSON ok=true：3，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | msg, ok |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 编译、清理、调试 echo、简单交互 entries[224] |

#### POST /api/lab/debug/cmd

执行调试命令；实现约定记录 continue/interrupt/step/finish/stepi/nexti，不是完整枚举。未见 next，nexti 不能代替源码步过。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 35；HTTP 状态：200；JSON ok=true：29，ok=false：6 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | action |
| JSON 响应顶层字段 | error, msg, ok, stopped |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[229]；步操控、mmu、文件系统、求值、断点 entries[185] |

#### GET /api/lab/debug/breakpoints

查询断点；条目结构、符号版本及实际命中待验证。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 52；HTTP 状态：200；JSON ok=true：52，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | breakpoints, ok |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[176] |

#### POST /api/lab/debug/breakpoint

更新断点；实现约定记录 repo/file/breakpoints:[行号…] 为完整集合，空集合清除。action 的值与适用模式未知，行号基准和条件断点待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 7；HTTP 状态：200；JSON ok=true：7，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | action, breakpoints, file, repo |
| JSON 响应顶层字段 | breakpoints, ok |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[425] |

### 调试数据与教学报告

#### GET /api/lab/debug/state

读取综合状态；backtrace/locals 等嵌套结构及快照一致性未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 36；HTTP 状态：200；JSON ok=true：36，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | backtrace, breakpoints, eip, eip_full, locals, ok, source_file, source_line, vm_running |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[181] |

#### GET /api/lab/debug/registers

读取寄存器；分组结构与运行状态限制待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 32；HTTP 状态：200；JSON ok=true：32，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | control, debug, eflags, eip, general, mode, ok, segments, system, vm_running |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[179] |

#### GET /api/lab/debug/stack

读取栈与帧；_dbg_* 可能是诊断字段，不应当成稳定 UI 依赖。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 29；HTTP 状态：200；JSON ok=true：27，ok=false：2 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | _dbg_bt_frames, _dbg_count_words, _dbg_frame_ebps, _dbg_frame_raw, _dbg_level_dist, _dbg_local_sizes, _dbg_parsed_words, _dbg_read_high, _dbg_read_low, _dbg_x_raw_tail, ebp_reg, error, esp, frame_base, frames, note, ok, stack |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[351]；步操控、mmu、文件系统、求值、断点 entries[183] |

#### GET /api/lab/debug/disasm

读取反汇编；full/syntax 值与默认值、instructions 结构未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 33；HTTP 状态：200；JSON ok=true：33，ok=false：0 |
| Query 字段 | full, syntax |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | eip, eip_full, function, instructions, mode, ok, source_file, source_line, vm_running |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[182] |

#### GET /api/lab/debug/memory

读取内存；addr/count/fmt/phys/unit 可能对应地址、数量、格式、物理模式、单位，具体取值和单位未知。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 3；HTTP 状态：200；JSON ok=true：3，ok=false：0 |
| Query 字段 | addr, count, fmt, phys, unit |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | count, fmt, ok, rows, symbol |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[424] |

#### GET /api/lab/debug/eval

求值表达式；已记录成员不存在错误，表达式可能有副作用，不自动求值或重放。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 2；HTTP 状态：200；JSON ok=true：1，ok=false：1 |
| Query 字段 | expr |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | address, error, expr, members, ok, value |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[420]；步操控、mmu、文件系统、求值、断点 entries[423] |

#### GET /api/lab/debug/lab-report

读取教学报告；实现约定记录 mmu 成功和 fs 空态，type 完整枚举、范围参数单位未知，不要求所有字段同时出现。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 7；HTTP 状态：200；JSON ok=true：4，ok=false：3 |
| Query 字段 | kernel_size, kernel_start, pt_start, type, user_size, user_start |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | consts, cr3, current_pid, error, fs_count, inodes, layout, message, ok, pd_phys, pd_used_default, pd_vaddr, pde0, pde1, pdeK, proc_count, procs, ptes, running, segs, swtch_count, type, vm_running |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 步操控、mmu、文件系统、求值、断点 entries[379]；步操控、mmu、文件系统、求值、断点 entries[407] |

### 代码索引与知识图谱

#### GET /api/lab/code-index

获取 CSV 代码索引；列名及版本绑定待确认，使用 CSV 解析器。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 9；HTTP 状态：200；JSON ok=true：0，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | 未观察到 JSON 对象；检查正文格式/空响应 |
| 请求 MIME | 未记录 |
| 响应 MIME | text/csv; charset=utf-8 |
| 证据 | “代码分析” 基本操作 entries[83] |

#### GET /api/code-annotations

查询符号注释；symbol_id 与索引的关系及 annotations 结构待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 14；HTTP 状态：200；JSON ok=true：14，ok=false：0 |
| Query 字段 | symbol_id |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | annotations, ok |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “代码分析” 基本操作 entries[89] |

#### GET /api/kg/all-nodes

查询知识节点树；total/tree 的完整性与层级含义待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 6；HTTP 状态：200；JSON ok=true：6，ok=false：0 |
| Query 字段 | _ |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | ok, total, tree |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “代码分析” 基本操作 entries[84] |

#### GET /api/kg/associations

查询知识关联；节点引用与关联类型待确认。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 14；HTTP 状态：200；JSON ok=true：14，ok=false：0 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | 未观察到；不表示所有请求都必须无正文 |
| JSON 响应顶层字段 | associations, ok |
| 请求 MIME | 未记录 |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | “代码分析” 基本操作 entries[90] |

### 管理接口

#### POST /api/admin/repo-update

可能用于修改仓库名和描述；只有 403 拒绝样本，不证明成功语义或学生权限。

| 项目 | 已观测内容 |
|---|---|
| 样本 / HTTP 状态 / 业务计数 | 2；HTTP 状态：403；JSON ok=true：0，ok=false：2 |
| Query 字段 | 未观察到 |
| JSON 请求字段 | description, new_name, repo |
| JSON 响应顶层字段 | error, ok |
| 请求 MIME | application/json |
| 响应 MIME | application/json; charset=utf-8 |
| 证据 | 开始实验、修改文件、diff、删除文件 entries[107] |

## 3. 建议调用流程（客户端设计）

### 登录与读取仓库

1. 调用 login，保存服务端 Cookie，再调用 me 核验身份。
2. 调用 student/repos，由用户选择可见仓库。
3. 调用 tree 获取目录，再调用 file 读取文件。
4. 编辑前可调用 lock-state，但客户端判断不能代替服务端权限检查。

现有证据没有证明只读浏览必须先创建容器。下载时检查路径越界、重复、大小写冲突和未知编码。

### 编辑与同步

读取远端建立基线 → 本地编辑 → 上传前重新读取远端并比较基线 → 处理冲突 → 调用 save/create/delete → 回读确认。

save 未观察到条件写参数，检查与写入之间仍有竞争窗口；delete 是否校验 SHA 也未知。多文件操作逐项记录成功、失败或结果未知，不能当成事务。diff-cache 面向参考仓库差异，不解决本地同步冲突。

### 实验环境与调试

调用 ensure 获取连接信息 → 按需受控调用 git-pull → 通过终端执行实验配置中的构建/运行命令 → 查询 debug/targets 和 debug/status → connect → 按状态读取数据或发送 cmd → disconnect。

这不是服务端强制顺序。GDB 操作建议串行调度，运行/暂停转换需要状态确认。实现约定记录运行中部分报告不可读、用户态不支持部分进程/MMU 卡片，以及 GDB 忙、函数边界缺失、寄存器读取失败等限制。`ok=true, fs_count=0, inodes=[]` 是已记录的 fs 空态，应显示为空数据。

## 4. HTTP 之外的能力边界

实现约定记录终端连接形态为 `wss://{platform}/wsproxy/{gatewayPort}/{token}`，VNC 追加 `/vnc`。参数来自 ensure 响应；`ws_port`、`term_gate_port`、`vnc_port` 的精确选用关系应核验，不相互替代。终端观察到发送 input/resize、接收 ready/data；VNC 使用二进制帧。握手鉴权、Origin、令牌有效期与续期未确认，完整 WebSocket 协议不属于本 HTTP 文档。

当前 HTTP 清单没有独立的编译、清理、启动/重启虚拟机或生成报告模板端点。抓包场景名称不等于 API 路径，不能补造 build/run/restart/report-template。debug/lab-report 是教学数据查询，不等同于生成报告文件。实现约定提及 analytics/heartbeat，但未提供完整方法、路径和字段，故不纳入这 43 个接口。

## 5. 请求示意与验证缺口

以下值均为人工占位值，仅演示字段名，不代表有效参数、必填集合或类型保证，不能直接作为契约 fixture。

登录 JSON 请求：

```json
{
  "username": "<账号>",
  "password": "<密码>"
}
```

保存 JSON 请求：

```json
{
  "repo": "<平台仓库标识>",
  "path": "<仓库内文件路径>",
  "content": "<待保存的文本>"
}
```

不合成成功响应样例，以免把未知嵌套结构和字段并集当成真实响应。

| 优先级 | 待补充证据 | 影响 |
|---|---|---|
| P0 | login/me/logout 脱敏正文、Cookie 过期与撤销、CSRF、独立客户端认证 | 确定认证及异常恢复 |
| P0 | repos/tree/file 非空嵌套样本、字段类型、路径与编码、大小限制、分页 | 建立可验证的只读模型 |
| P1 | save/create/delete 权限、重复请求、SHA 校验、冲突和超时结果 | 确定写入保护边界 |
| P1 | ensure/git-pull 覆盖语义、持久化及网关字段映射 | 确定环境同步和连接方式 |
| P2 | 调试状态、action 枚举、行号基准、非空栈/变量/内存 | 建立调试数据模型 |
| P2 | 报告 type 对应结构、地址单位、非空 inode、运行限制 | 建立教学面板模型 |
| P2 | fork/submit/status、管理权限、CSV 列和图谱结构 | 明确其他功能边界 |

后续应按端点分别保存脱敏成功、失败和空态样本，再逐项建立类型、必填性和枚举证据。当前文档适合作为实现与联调索引，尚不足以生成具有严格 schema 的 SDK。


