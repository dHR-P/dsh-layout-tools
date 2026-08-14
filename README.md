# dsh-layout-tools

DSH Web 三栏工作台插件：把中间对话流清干净，工具调用和思考挪到右侧，左侧显示工作区文件树（带 git 状态）。

- **对话流净化**：中间的对话流只保留 AI 文本输出，工具调用卡片和 Think 行不再出现（通过官方 slot 机制 shadow + CSS 隐藏）
- **左侧文件树**：当前会话工作区的目录树（懒加载展开，跳过 `.git` / `node_modules`），每个文件带 git 状态徽标（M 修改 / A 新增 / D 删除 / R 重命名 / ?? 未跟踪 / U 冲突），顶部显示当前分支
- **右侧工具面板**：实时工具调用列表（名称 / 状态 / 参数 / 错误 / 结果 / 子调用递归）+ Think 内容，自动滚动跟随

## 安装

前置：已装好 DSH（`dsh web` 可运行），Node.js ≥ 22，pnpm ≥ 10。

```sh
dsh plugin --profile web add dsh-layout-tools
```

装完**重启 `dsh web`**，刷新页面即生效。

## 使用

- 窗口宽度 > 1700px 时左右面板自动展开；≤ 1700px 时面板隐藏（避免挤压对话区），需要时点击屏幕边缘的 `▶` / `◀` 手柄临时展开
- 面板头部按钮：左面板 `⟳` 刷新文件树与 git 状态，`«` / `»` 收起对应面板
- 文件树：点击目录懒加载展开/收起子目录；git 徽标随分支切换和文件变更自动刷新（手动刷新用 `⟳`）
- 工具卡片：点击展开/收起参数、错误与结果文本；Think 块同样可展开

## 卸载

```sh
dsh plugin --profile web remove dsh-layout-tools
```

重启 `dsh web` 后完全恢复官方布局。

## 兼容性

- 目标版本：`@deepseek-ai/dsh` 0.1.0-rc.6 系列（peerDependencies 已声明）
- 实现依赖官方 UI 的稳定标记：`data-chat-flow-kind`（对话节点）、`data-variant="think"`（思考行）、slot 契约 `conversation.chat.node` / `conversation.input.dock`。官方 UI 升级若调整这些标记，本插件可能失效——欢迎提 issue / PR
- host 侧提供 `/dsh-layout/fs-list` 与 `/dsh-layout/git-status` 两个只读路由，路径经 realpath 校验必须位于已注册工作区内（与官方 git-graph 插件同款安全边界）

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

## 许可

MIT
