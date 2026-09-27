# TJOS 平台 HTTP 接口观测合同 v0.1

日期：2026-09-27。此文档根据本地抓包生成，不是服务端正式规范。字段为观测并集，不代表必填性；缺少字段、null、未知枚举必须容错。未重放请求。所有请求值、响应值、Cookie、令牌和源码均不导出。样本索引为 HAR log.entries 的零基索引。

## 来源清单

| 抓包 | HTTP 条数 | SHA256 |
|---|---:|---|
| “代码分析” 基本操作 | 120 | 9254359E9A1BE89C380255D390C15AB3434D1BB981701E014923057069D25FA4 |
| “实验平台” 基本操作 | 168 | 2817DD0FCEE118C5BD7FBEF913E614F9349EBD3D654D4BAF58CBA5A484C8B08F |
| 实验平台可视化分析 | 129 | E4CD88C2EAF75E22357A0E719CCD6797142760FD8F7CFE9E533327DF77D41989 |
| 开始实验、修改文件、diff、删除文件 | 178 | 418D302DCAAE28C584E81B8CE6CC0E773D9585C211A0D3ED2C19A77B9B55AC94 |
| 打开代码库，编辑文件，保存 | 150 | D7E34FD9E256F917EB636EC0FB0A61326AE71D1494DC4E661608A2D858B79054 |
| 步操控、mmu、文件系统、求值、断点 | 437 | 6283125991DD42BBF195ED944B707719E5D1056C27174B24DB9FF9C020B9DA3E |
| 登录与登出 | 174 | FFD7FB4150AAB57A8947ECD9EBCB015D0638815756337B17EFF8424A151D2BBF |
| 编译、清理、调试 echo、简单交互 | 233 | 72E230B792B934FE8086DF7E615361433188519877E6190D4316820361D35CA1 |
| 虚拟机截图、虚拟机重启、生成实验报告模板 | 407 | C351884D66AB186726E3EACAAB363CCFD3FE5847136950447CCB610BE7E4597B |
| 调试器详细功能 | 223 | 7F22A86B4F84AC68E3AB267D39EAE52614B4B929B7F1CB1353F5769B2A3E9F24 |
| 运行、启动虚拟机、与虚拟机系统交互 | 185 | 0456DF6A8C178779F50C7EA9E2AA62DE02D385669CF64496F313785F8786B5B4 |
| 登录.har | 84 | 7EF952346DBFE1B7447098D06DC416EDB6C60E6A3CB1AD6458A5F522486A81D1 |
| 实验平台与仓库读取.har | 45 | EDBDD4AE26CDB1632BA3C55AC2FB7F3F154F001B70EE3DB69436D548DB0D48F6 |
| 在登录后的首页刷新.har | 83 | D40DC280C03D47A28D1E18F34E7E4AAC73DE1F1DF9A4C0DF633142671628CFF1 |

## 接口清单

### GET /api/auth/me

- 样本：1；HTTP 状态：200；JSON ok=true：1，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：_
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：display_name, is_teacher, ok, role, username
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：在登录后的首页刷新.har entries[47]

### GET /api/code-annotations

- 样本：14；HTTP 状态：200；JSON ok=true：14，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：symbol_id
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：annotations, ok
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“代码分析” 基本操作 entries[89]

### GET /api/kg/all-nodes

- 样本：6；HTTP 状态：200；JSON ok=true：6，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：_
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：ok, total, tree
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“代码分析” 基本操作 entries[84]

### GET /api/kg/associations

- 样本：14；HTTP 状态：200；JSON ok=true：14，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：associations, ok
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“代码分析” 基本操作 entries[90]

### GET /api/lab/assignments

- 样本：44；HTTP 状态：200, 401；JSON ok=true：31，ok=false：13。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：assignments, class_totals, error, ok
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[96]；“代码分析” 基本操作 entries[44]

### GET /api/lab/assignments/{assignment}/guide

- 样本：1；HTTP 状态：200；JSON ok=true：0，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：未观察到 JSON 对象；检查正文格式/空响应
- 请求 MIME：
- 响应 MIME：application/pdf
- 证据：“实验平台” 基本操作 entries[147]

### GET /api/lab/assignments/{assignment}/sections

- 样本：1；HTTP 状态：200；JSON ok=true：1，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：guide_filename, name, ok, sections
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[146]

### GET /api/lab/code-index

- 样本：9；HTTP 状态：200；JSON ok=true：0，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：未观察到 JSON 对象；检查正文格式/空响应
- 请求 MIME：
- 响应 MIME：text/csv; charset=utf-8
- 证据：“代码分析” 基本操作 entries[83]

### GET /api/lab/debug/breakpoints

- 样本：52；HTTP 状态：200；JSON ok=true：52，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：breakpoints, ok
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[176]

### GET /api/lab/debug/disasm

- 样本：33；HTTP 状态：200；JSON ok=true：33，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：full, syntax
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：eip, eip_full, function, instructions, mode, ok, source_file, source_line, vm_running
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[182]

### GET /api/lab/debug/eval

- 样本：2；HTTP 状态：200；JSON ok=true：1，ok=false：1。未出现 ok 的响应按端点格式处理。
- Query 字段：expr
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：address, error, expr, members, ok, value
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[420]；步操控、mmu、文件系统、求值、断点 entries[423]

### GET /api/lab/debug/lab-report

- 样本：7；HTTP 状态：200；JSON ok=true：4，ok=false：3。未出现 ok 的响应按端点格式处理。
- Query 字段：kernel_size, kernel_start, pt_start, type, user_size, user_start
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：consts, cr3, current_pid, error, fs_count, inodes, layout, message, ok, pd_phys, pd_used_default, pd_vaddr, pde0, pde1, pdeK, proc_count, procs, ptes, running, segs, swtch_count, type, vm_running
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[379]；步操控、mmu、文件系统、求值、断点 entries[407]

### GET /api/lab/debug/memory

- 样本：3；HTTP 状态：200；JSON ok=true：3，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：addr, count, fmt, phys, unit
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：count, fmt, ok, rows, symbol
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[424]

### GET /api/lab/debug/registers

- 样本：32；HTTP 状态：200；JSON ok=true：32，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：control, debug, eflags, eip, general, mode, ok, segments, system, vm_running
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[179]

### GET /api/lab/debug/stack

- 样本：29；HTTP 状态：200；JSON ok=true：27，ok=false：2。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：_dbg_bt_frames, _dbg_count_words, _dbg_frame_ebps, _dbg_frame_raw, _dbg_level_dist, _dbg_local_sizes, _dbg_parsed_words, _dbg_read_high, _dbg_read_low, _dbg_x_raw_tail, ebp_reg, error, esp, frame_base, frames, note, ok, stack
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[351]；步操控、mmu、文件系统、求值、断点 entries[183]

### GET /api/lab/debug/state

- 样本：36；HTTP 状态：200；JSON ok=true：36，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：backtrace, breakpoints, eip, eip_full, locals, ok, source_file, source_line, vm_running
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[181]

### GET /api/lab/debug/status

- 样本：101；HTTP 状态：200；JSON ok=true：101，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：cleaned, connected, ok, target, vm_running
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[141]

### GET /api/lab/debug/targets

- 样本：97；HTTP 状态：200；JSON ok=true：97，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：current, hint, ok, targets
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[105]

### GET /api/lab/file

- 样本：19；HTTP 状态：200, 404；JSON ok=true：18，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：path, repo
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：content, error, is_fork, name, ok, path, repo, repo_parent, sha, size
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[156]；虚拟机截图、虚拟机重启、生成实验报告模板 entries[398]

### GET /api/lab/help-docs

- 样本：2；HTTP 状态：200；JSON ok=true：2，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：docs, ok
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[114]

### GET /api/lab/help-docs/{document}/view

- 样本：1；HTTP 状态：200；JSON ok=true：0，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：未观察到 JSON 对象；检查正文格式/空响应
- 请求 MIME：
- 响应 MIME：text/html; charset=utf-8
- 证据：“实验平台” 基本操作 entries[129]

### GET /api/lab/lock-state

- 样本：18；HTTP 状态：200；JSON ok=true：18，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：repo
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：assignment_id, locked, ok, state
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[138]

### GET /api/lab/resolve-path

- 样本：8；HTTP 状态：200, 500；JSON ok=true：1，ok=false：7。未出现 ok 的响应按端点格式处理。
- Query 字段：path, repo
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：error, ok, original, resolved_path
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：实验平台可视化分析 entries[124]；“代码分析” 基本操作 entries[88]

### GET /api/lab/submissions

- 样本：10；HTTP 状态：200；JSON ok=true：10，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：assignment, student
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：ok, submissions
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[112]

### GET /api/lab/tree

- 样本：19；HTTP 状态：200；JSON ok=true：19，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：repo
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：ok, tree
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[139]

### GET /api/student/repos

- 样本：23；HTTP 状态：200；JSON ok=true：23，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：_t
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：base_repos, excellent_repos, my_repos, ok, public_repos
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[97]

### POST /api/admin/repo-update

- 样本：2；HTTP 状态：403；JSON ok=true：0，ok=false：2。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：description, new_name, repo
- JSON 响应顶层字段：error, ok
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：开始实验、修改文件、diff、删除文件 entries[107]

### POST /api/auth/login

- 样本：13；HTTP 状态：200, 401；JSON ok=true：12，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：password, username
- JSON 响应顶层字段：avatar_url, error, full_name, is_ta, is_teacher, must_change_password, ok, role, token, username
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：“代码分析” 基本操作 entries[81]；运行、启动虚拟机、与虚拟机系统交互 entries[86]

### POST /api/auth/logout

- 样本：1；HTTP 状态：200；JSON ok=true：0，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：未观察到 JSON 对象；检查正文格式/空响应
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：登录与登出 entries[87]

### POST /api/lab/capture

- 样本：1；HTTP 状态：200；JSON ok=true：1，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：data, kind, name, repo
- JSON 响应顶层字段：kind, ok, path, size
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：虚拟机截图、虚拟机重启、生成实验报告模板 entries[277]

### POST /api/lab/container/ensure

- 样本：26；HTTP 状态：200；JSON ok=true：26，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：repo, username
- JSON 响应顶层字段：container, ok, status, term_gate_port, term_token, vnc_port, work_dir, ws_port
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：“实验平台” 基本操作 entries[98]

### POST /api/lab/container/git-pull

- 样本：11；HTTP 状态：200；JSON ok=true：11，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：repo, username
- JSON 响应顶层字段：ok, output, prev_repo, repo, switched
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[111]

### POST /api/lab/debug/breakpoint

- 样本：7；HTTP 状态：200；JSON ok=true：7，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：action, breakpoints, file, repo
- JSON 响应顶层字段：breakpoints, ok
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[425]

### POST /api/lab/debug/cmd

- 样本：35；HTTP 状态：200；JSON ok=true：29，ok=false：6。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：action
- JSON 响应顶层字段：error, msg, ok, stopped
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[229]；步操控、mmu、文件系统、求值、断点 entries[185]

### POST /api/lab/debug/connect

- 样本：4；HTTP 状态：200；JSON ok=true：3，ok=false：1。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：repo, target
- JSON 响应顶层字段：eip, error, msg, ok, stopped, warning
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：步操控、mmu、文件系统、求值、断点 entries[108]；步操控、mmu、文件系统、求值、断点 entries[175]

### POST /api/lab/debug/disconnect

- 样本：3；HTTP 状态：200；JSON ok=true：3，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：msg, ok
- 请求 MIME：
- 响应 MIME：application/json; charset=utf-8
- 证据：编译、清理、调试 echo、简单交互 entries[224]

### POST /api/lab/diff-cache

- 样本：12；HTTP 状态：200, 400；JSON ok=true：6，ok=false：6。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：ref_repo, repo
- JSON 响应顶层字段：cached_at, diffs, error, files_added, files_deleted, files_modified, ok, ref_repo, repo, sha_mismatch_candidates, student_repo, total_files
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：开始实验、修改文件、diff、删除文件 entries[123]；打开代码库，编辑文件，保存 entries[139]

### POST /api/lab/file/create

- 样本：1；HTTP 状态：200；JSON ok=true：1，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：content, message, path, repo
- JSON 响应顶层字段：ok, path, repo, sha
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：虚拟机截图、虚拟机重启、生成实验报告模板 entries[399]

### POST /api/lab/file/delete

- 样本：2；HTTP 状态：200；JSON ok=true：2，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：message, path, repo, sha
- JSON 响应顶层字段：ok, path, repo
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：开始实验、修改文件、diff、删除文件 entries[159]

### POST /api/lab/fork

- 样本：1；HTTP 状态：200；JSON ok=true：1，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：assignment_id, source, target_name
- JSON 响应顶层字段：full_name, ok, target_name
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：开始实验、修改文件、diff、删除文件 entries[113]

### POST /api/lab/save

- 样本：8；HTTP 状态：200；JSON ok=true：8，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：content, path, repo
- JSON 响应顶层字段：ok, path, sha
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：开始实验、修改文件、diff、删除文件 entries[134]

### POST /api/lab/submit

- 样本：1；HTTP 状态：200；JSON ok=true：1，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：assignment_id, repo, status, student
- JSON 响应顶层字段：ok, submission
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：开始实验、修改文件、diff、删除文件 entries[114]

### POST /api/lab/vm/stop

- 样本：3；HTTP 状态：200；JSON ok=true：2，ok=false：0。未出现 ok 的响应按端点格式处理。
- Query 字段：未观察到
- JSON 请求字段：未观察到；不表示所有请求都必须无正文
- JSON 响应顶层字段：message, ok
- 请求 MIME：application/json
- 响应 MIME：application/json; charset=utf-8
- 证据：虚拟机截图、虚拟机重启、生成实验报告模板 entries[280]；编译、清理、调试 echo、简单交互 entries[231]
