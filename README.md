# dsh-layout-tools

DSH Web 布局插件：对话流净化（隐藏工具卡片，保留思考过程展示）+ 左侧工作区文件树（带 git 状态）。

- **对话流净化**：中间的对话流只保留 AI 文本输出，工具调用卡片不再出现（通过官方 slot 机制 shadow + CSS 隐藏）；**模型的思考过程（Think）在对话区内正常展示**（官方 ReasoningRow，点击展开）
- **左侧文件树**：当前会话工作区的目录树（懒加载展开，跳过 `.git` / `node_modules`），文件名按 git 状态着色（M 修改 / A 新增 / D 删除 / R 重命名 / ?? 未跟踪 / U 冲突，目录含变更则标红），顶部显示当前分支
- **对话字号**：右下角 A− / A+ 调节对话区字体（12–28px，仅作用于对话流节点）
- **底部余额状态栏**：对话区底部（输入框上方）显示**当前所选模型来源**的余额/用量——选中 DeepSeek 官方显示 `¥` 余额，选中 OpenCode Go 显示滚动/周/月用量百分比（替代官方轮/步统计行，点击 `⟳` 刷新；密钥仅 host 侧从 `~/.dsh/.credentials.yaml` 读取，不返回浏览器）
- 工具调用的详情请使用 DSH 官方**轨迹**视图（本插件不再自带工具面板）

## 安装

前置：已装好 DSH（`dsh web` 可运行），Node.js ≥ 22，pnpm ≥ 10。

```sh
dsh plugin --profile web add "github:dHR-P/dsh-layout-tools"
```

装完**重启 `dsh web`**，刷新页面即生效。

## 使用

- 窗口宽度 > 1700px 时左侧面板自动展开；≤ 1700px 时面板隐藏（避免挤压对话区），需要时点击屏幕边缘的 `▶` 手柄临时展开
- 面板头部按钮：左面板 `⟳` 刷新文件树与 git 状态，`«` 收起面板
- 文件树：点击目录懒加载展开/收起子目录；**点击文件用系统默认程序打开**（如记事本 / VSCode，与 Windows 资源管理器双击行为一致）；git 着色随分支切换和文件变更自动刷新（手动刷新用 `⟳`）
- 思考过程：模型输出时对话区内显示 Thinking 行（可点击展开完整内容）；工具调用详情见官方轨迹视图

## 卸载

```sh
dsh plugin --profile web remove dsh-layout-tools
```

重启 `dsh web` 后完全恢复官方布局。

## 兼容性

- 目标版本：`@deepseek-ai/dsh` 0.1.0-rc.6 系列（peerDependencies 已声明）
- 实现依赖官方 UI 的稳定标记：`data-chat-flow-kind`（对话节点）、`data-variant="think"`（思考行）、slot 契约 `conversation.chat.node` / `conversation.input.dock`。官方 UI 升级若调整这些标记，本插件可能失效——欢迎提 issue / PR
- host 侧提供 `/dsh-layout/*` 路由（`fs-list` / `git-status` / `git-branches` / `git-switch` / `git-log` / `open-file`），路径经 realpath 校验必须位于已注册工作区内（与官方 git-graph 插件同款安全边界）；`open-file` 通过 `cmd /c start` 调用系统 ShellExecute，仅在 Windows 上可用

## 开发

插件为纯手写 bundle（无构建链）：

```
dsh-layout-tools/
├── package.json        # bundle 声明（host + client 双 half）
├── cordis.patch.yml    # 挂载行
└── lib/
    ├── index.js        # host half：/dsh-layout/* 路由（fs 枚举 + git status）
    └── client.js       # 浏览器 half（window.__ModuleLoader__.load 契约）
```

本地调试用 link 安装，改完刷新即生效：

```sh
dsh plugin --profile web add link:/绝对/路径/dsh-layout-tools
```

## 参考

本插件的设计与实现参考了以下项目，致谢：

- [@linxin666/dsh-client-ui-git-graph](https://github.com/linxin666/dsh-client-ui-git-graph) — host 侧路由 / 子进程封装 / 工作区安全边界的模式参考（`/dsh-layout/*` 路由、`subprocessRunner`、`parseStatusZ` 均沿袭其设计）
- [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) — 侧边栏工作台架构参考（会话作用域 API、浏览器端与 host 通信的 wire 设计）
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 官方 slot 契约（`conversation.chat.node` / `conversation.input.dock`）、DOM 标记（`data-chat-flow-kind` / `data-variant="think"`）与预设组合文档
- 配套预设 [dsh-anchored-wsl](https://github.com/dHR-P/dsh-anchored-wsl) — 极简锚定两阶段模式（首轮极简 + 标准工具）

## 许可

MIT
