/**
 * dsh-layout-tools — client half (hand-written __ModuleLoader__ bundle).
 *
 * Layout overhaul for the DSH web GUI:
 *  - conversation flow: tool-call nodes and think rows are removed from the
 *    center column (keyed-slot shadow at priority -1 + CSS belt-and-suspenders)
 *  - left panel: workspace file tree with git-change badges
 *  - right panel: tool calls (args / state / result) + think blocks, live
 *
 * No build chain: this file is the browser bundle as served by client-modules
 * at /plugins/<id>/client.js.
 */
window.__ModuleLoader__.load({
	id: "dsh-layout-tools",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");

		// ------------------------------------------------------------------
		// Locale
		// ------------------------------------------------------------------
		const NS = "dsh-layout-tools";
		const zh = {
			leftTitle: "文件",
			rightTitle: "工具调用",
			empty: "暂无",
			refresh: "刷新",
			collapse: "收起",
			branch: "分支",
			noWorkspace: "无工作区",
			notRepo: "非 git 仓库",
			think: "思考",
			running: "运行中",
			stopped: "已停止",
			error: "错误",
			ok: "完成"
		};
		const en = {
			leftTitle: "Files",
			rightTitle: "Tools",
			empty: "None",
			refresh: "Refresh",
			collapse: "Collapse",
			branch: "Branch",
			noWorkspace: "No workspace",
			notRepo: "Not a git repo",
			think: "Think",
			running: "running",
			stopped: "stopped",
			error: "error",
			ok: "done"
		};

		// ------------------------------------------------------------------
		// Styles (injected once; mirrored selectors are stable, non-hash)
		// ------------------------------------------------------------------
		const CSS = `
[data-chat-flow-kind="tool-call"], [data-chat-flow-kind="tool-result"] { display: none !important; }
[data-variant="think"] { display: none !important; }
/* Structure-level fallback for the conversation column width: the scroll
   container's only direct child is the content column. */
[data-conversation-scroll] > div { max-width: 1600px; }
/* Conversation font size, user-adjustable (A−/A+ control). POSITIVE scoping:
   only the user-message and assistant-answer flow nodes follow the setting —
   everything else (panels, sidebar, other node kinds) keeps its own size,
   so future DSH DOM changes cannot drag plugin surfaces along. */
[data-chat-flow-kind="user"], [data-chat-flow-kind="assistant-step"] { font-size: var(--dsh-chat-font-size, 16px); }
[data-chat-flow-kind="user"] *, [data-chat-flow-kind="assistant-step"] * { font-size: var(--dsh-chat-font-size, 16px) !important; }
.dsh-layout-panel, .dsh-layout-fontctl, .dsh-layout-tab { font-size: 0.8125rem; }
.dsh-layout-fontctl {
  position: fixed; right: calc(var(--dsh-layout-right, 0px) + 12px); bottom: 14px; z-index: 15;
  display: flex; align-items: center; gap: 4px;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px;
  padding: 3px 6px; box-shadow: 0 2px 8px var(--dsw-alias-bg-mask-2, rgba(0,0,0,.12));
}
.dsh-layout-fontbtn {
  width: 24px; height: 24px; border-radius: 50%;
  border: none; background: var(--dsw-alias-button-tool-bar-fill);
  color: var(--dsw-alias-label-primary); cursor: pointer; font-size: 0.8125rem;
}
.dsh-layout-fontbtn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-fontval { font-size: 0.75rem; color: var(--dsw-alias-label-secondary); min-width: 22px; text-align: center; }
body { --dsh-layout-left: 240px; --dsh-layout-right: 300px; }
body[data-dsh-layout-left="off"] { --dsh-layout-left: 0px; }
body[data-dsh-layout-right="off"] { --dsh-layout-right: 0px; }
.dsh-layout-panel {
  position: fixed; top: 0; bottom: 0; z-index: 12;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l1);
  display: flex; flex-direction: column; min-width: 0;
  transition: transform var(--ds-transition-duration-slow, .2s) var(--ds-ease-in-out, ease);
}
.dsh-layout-panel-left { left: var(--dsh-layout-left-offset, 280px); width: 240px; border-left: none; border-right: none; box-shadow: 4px 0 16px var(--dsw-alias-bg-mask-2, rgba(0,0,0,.08)); }
.dsh-layout-panel-right { right: 0; width: 300px; border-right: none; border-left: none; box-shadow: -4px 0 16px var(--dsw-alias-bg-mask-2, rgba(0,0,0,.08)); }
body[data-dsh-layout-left="off"] .dsh-layout-panel-left { display: none; }
body[data-dsh-layout-right="off"] .dsh-layout-panel-right { transform: translateX(100%); }
.dsh-layout-tab {
  position: fixed; top: 50%; transform: translateY(-50%);
  width: 22px; height: 72px; z-index: 12;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer; font-size: 0.75rem; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px var(--dsw-alias-bg-mask-2, rgba(0,0,0,.12));
}
.dsh-layout-tab:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
/* Left tab sits on the conversation-side edge of the left panel: the official
   sidebar width (--dsh-layout-left-offset) + the panel width (--dsh-layout-left,
   which drops to 0 when the panel collapses, pulling the tab back to the
   sidebar edge). */
.dsh-layout-tab-left {
  left: calc(var(--dsh-layout-left-offset, 280px) + var(--dsh-layout-left, 240px));
  border-radius: 0 8px 8px 0;
}
/* Right tab sits on the conversation-side edge of the right panel; collapsing
   (--dsh-layout-right = 0) pulls it to the screen edge. */
.dsh-layout-tab-right {
  right: var(--dsh-layout-right, 300px);
  border-radius: 8px 0 0 8px;
}
.dsh-layout-header {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: 0.8125rem; font-weight: 500; color: var(--dsw-alias-label-primary);
}
.dsh-layout-header-btn {
  margin-left: auto; cursor: pointer; user-select: none;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-button-tool-bar-fill);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px;
  font-size: 0.75rem; padding: 2px 8px;
}
.dsh-layout-header-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-body { flex: 1; min-height: 0; overflow: auto; padding: 6px 4px; font-size: 0.8125rem; }
.dsh-layout-tree-row {
  display: flex; align-items: center; gap: 5px; padding: 2px 6px;
  border-radius: 6px; cursor: pointer; white-space: nowrap; min-width: 0;
  color: var(--dsw-alias-label-primary);
}
.dsh-layout-tree-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-tree-name { overflow: hidden; text-overflow: ellipsis; }
.dsh-layout-tree-dir { color: var(--dsw-alias-label-primary); font-weight: 500; }
.dsh-layout-tree-dirty { color: #ff7b72 !important; }
.dsh-layout-tree-git-M, .dsh-layout-tree-git-T { color: #e5b13a; }
.dsh-layout-tree-git-A { color: #57ab5a; }
.dsh-layout-tree-git-D { color: #e55c5c; text-decoration: line-through; }
.dsh-layout-tree-git-R, .dsh-layout-tree-git-C { color: #58a6ff; }
.dsh-layout-tree-git-U, .dsh-layout-tree-git-! { color: #ff7b72; }
.dsh-layout-tree-git-?? { color: var(--dsw-alias-label-tertiary); }
.dsh-layout-tool-card {
  margin: 2px 6px 6px; border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px; overflow: hidden;
}
.dsh-layout-tool-row {
  display: flex; align-items: center; gap: 6px; padding: 7px 10px; cursor: pointer;
}
.dsh-layout-tool-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.dsh-layout-dot.running { background: #e5b13a; }
.dsh-layout-dot.ok { background: #57ab5a; }
.dsh-layout-dot.error { background: #e55c5c; }
.dsh-layout-dot.stopped { background: var(--dsw-alias-label-tertiary); }
.dsh-layout-dot.think { background: #a371f7; }
.dsh-layout-tool-name { font-weight: 500; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; }
.dsh-layout-tool-state { margin-left: auto; font-size: 0.6875rem; color: var(--dsw-alias-label-tertiary); flex: none; }
.dsh-layout-code {
  margin: 0 10px 8px; padding: 8px 10px; border-radius: 8px;
  background: var(--dsw-alias-markdown-code-block);
  color: var(--dsw-alias-label-primary); font-family: var(--ds-font-family-code, monospace);
  font-size: 0.75rem; line-height: 18px; white-space: pre-wrap; word-break: break-word;
  max-height: 260px; overflow: auto;
}
.dsh-layout-code.dsh-layout-err { color: var(--dsw-alias-state-error-primary); }
.dsh-layout-think {
  margin: 2px 6px 6px; border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px; overflow: hidden;
}
.dsh-layout-think-header {
  display: flex; align-items: center; gap: 6px; padding: 7px 10px; cursor: pointer;
  color: var(--dsw-alias-label-secondary); font-weight: 500;
}
.dsh-layout-think-header:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-think-summary {
  padding: 0 10px 8px 24px; color: var(--dsw-alias-label-tertiary);
  font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dsh-layout-cwd {
  padding: 4px 12px 6px; font-size: 0.6875rem; line-height: 1.4;
  color: var(--dsw-alias-label-tertiary);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dsh-layout-gitbar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex-wrap: wrap;
}
.dsh-layout-branch-select {
  min-width: 0; flex: 1;
  background: var(--dsw-alias-button-tool-bar-fill);
  color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px;
  font-size: 0.75rem; padding: 3px 6px; cursor: pointer;
}
.dsh-layout-gitbar-err {
  width: 100%; color: var(--dsw-alias-state-error-primary);
  font-size: 0.6875rem; line-height: 1.4; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.dsh-layout-tabs {
  display: flex; gap: 4px; padding: 6px 10px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-layout-tab-btn {
  background: none; border: none; cursor: pointer;
  color: var(--dsw-alias-label-tertiary); font-size: 0.75rem;
  padding: 3px 10px; border-radius: 6px 6px 0 0;
  border-bottom: 2px solid transparent;
}
.dsh-layout-tab-btn:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-tab-btn-active {
  color: var(--dsw-alias-label-primary); font-weight: 500;
  border-bottom-color: var(--dsw-alias-brand-primary, #4d6bfe);
}
.dsh-layout-commit-row {
  padding: 5px 8px; border-radius: 6px; cursor: pointer; min-width: 0;
}
.dsh-layout-commit-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-commit-line { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.dsh-layout-commit-hash {
  flex: none; font-family: var(--ds-font-family-code, monospace);
  font-size: 0.6875rem; color: var(--dsw-alias-label-tertiary);
}
.dsh-layout-commit-subject {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-primary); font-size: 0.75rem;
}
.dsh-layout-commit-detail {
  margin-top: 4px; padding: 6px 8px; border-radius: 6px;
  background: var(--dsw-alias-markdown-code-block);
  color: var(--dsw-alias-label-secondary); font-size: 0.6875rem; line-height: 1.6;
  word-break: break-all;
}
.dsh-layout-empty { color: var(--dsw-alias-label-tertiary); text-align: center; padding: 24px 0; font-size: 0.8125rem; }
@media (max-width: 1800px) {
  .dsh-layout-panel { display: none !important; }
  .dsh-layout-tab { display: none !important; }
}
`;
		const CSS_ID = "dsh-layout-tools/layout.css";
		function injectCss() {
			if (typeof document === "undefined") return;
			if (document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_ID) + "]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-layout-tools";
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// ------------------------------------------------------------------
		// Host API
		// ------------------------------------------------------------------
		const TRANSPORT_ERROR = { code: "internal", message: "dsh-layout route unavailable" };
		async function post(path, payload) {
			let response;
			try {
				response = await fetch(path, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				});
			} catch {
				return { ok: false, error: TRANSPORT_ERROR };
			}
			try {
				const envelope = await response.json();
				if (typeof envelope !== "object" || envelope === null) return { ok: false, error: TRANSPORT_ERROR };
				if (envelope.ok === true) return { ok: true, value: envelope.value };
				return { ok: false, error: envelope.error ?? TRANSPORT_ERROR };
			} catch {
				return { ok: false, error: TRANSPORT_ERROR };
			}
		}

		// ------------------------------------------------------------------
		// Helpers
		// ------------------------------------------------------------------
		function truncate(text, max) {
			return text.length > max ? text.slice(0, max) + "…" : text;
		}
		function firstLine(text) {
			const i = text.indexOf("\n");
			return i === -1 ? text : text.slice(0, i);
		}
		/** Map a repo-root-relative git path onto the session cwd (null: outside). */
		function gitRelToCwd(root, cwd, file) {
			const r = root.replace(/\\/g, "/").replace(/\/+$/, "");
			const c = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
			const full = r + "/" + file.replace(/\\/g, "/");
			if (full === c) return "";
			if (full.startsWith(c + "/")) return full.slice(c.length + 1);
			return null;
		}
		/** Simplified result text of a settled tool block. */
		function resultSummary(block) {
			const rv = block.resultView;
			if (rv === void 0 || rv === null) return "";
			if (rv.card === "read" && Array.isArray(rv.lines)) {
				return rv.lines.map((line) => line.text).join("\n");
			}
			if (typeof rv.text === "string") return rv.text;
			if (typeof rv.output === "string") return rv.output;
			if (typeof rv.result === "string") return rv.result;
			return "";
		}
		/** Tool block → display name, running state, args, error. */
		function blockModel(block) {
			const done = "kind" in block;
			const name = done ? (block.call?.name ?? "") : (block.name ?? "");
			const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? "";
			const state = !done ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const errorText = done && block.isError ? (block.error?.message ?? block.error?.code ?? "") : "";
			return { done, name, argsRaw, state, errorText };
		}

		// ------------------------------------------------------------------
		// Slot shadow: remove tool-call / tool-result nodes from the flow
		// ------------------------------------------------------------------
		function NullView() {
			return null;
		}

		// ------------------------------------------------------------------
		// Left panel: workspace file tree + git badges
		// ------------------------------------------------------------------
		function CommitRow({ commit }) {
			const [open, setOpen] = react.useState(false);
			const when = commit.date === 0 ? "" : new Date(commit.date * 1000).toLocaleString();
			return react_jsx_runtime.jsxs("div", {
				className: "dsh-layout-commit-row",
				onClick: () => setOpen(!open),
				children: [
					react_jsx_runtime.jsxs("div", { className: "dsh-layout-commit-line", children: [
						react_jsx_runtime.jsx("span", { className: "dsh-layout-commit-hash", title: commit.hash, children: commit.short }),
						react_jsx_runtime.jsx("span", { className: "dsh-layout-commit-subject", children: commit.subject || "(no message)" })
					] }),
					open ? react_jsx_runtime.jsxs("div", { className: "dsh-layout-commit-detail", children: [
						react_jsx_runtime.jsx("div", { children: "author: " + commit.author }),
						react_jsx_runtime.jsx("div", { children: "date: " + when }),
						react_jsx_runtime.jsx("div", { children: "hash: " + commit.hash })
					] }) : null
				]
			});
		}

		function FileTree({ cwd }) {
			const [dirCache, setDirCache] = react.useState({});
			const [expanded, setExpanded] = react.useState({});
			const [gitFiles, setGitFiles] = react.useState({});
			const [branch, setBranch] = react.useState(null);
			const [branches, setBranches] = react.useState([]);
			const [commits, setCommits] = react.useState([]);
			const [view, setView] = react.useState("tree");
			const [switching, setSwitching] = react.useState(false);
			const [switchError, setSwitchError] = react.useState("");
			const [loading, setLoading] = react.useState(false);

			/** Git-only refresh (status/branches/log) — cheap enough to poll. */
			const gitRefresh = react.useCallback(async () => {
				if (cwd === void 0 || cwd === "") return;
				const [s, b, l] = await Promise.all([
					post("/dsh-layout/git-status", { path: cwd }),
					post("/dsh-layout/git-branches", { path: cwd }),
					post("/dsh-layout/git-log", { path: cwd })
				]);
				if (s.ok && s.value.root !== null) {
					setBranch(s.value.branch);
					const map = {};
					for (const f of s.value.files) {
						const rel = gitRelToCwd(s.value.root, cwd, f.path);
						if (rel !== null) map[rel] = f.status;
					}
					setGitFiles(map);
				} else {
					setBranch(null);
					setGitFiles({});
					setBranches([]);
					setCommits([]);
				}
				if (b.ok && b.value.root !== null) setBranches(b.value.branches);
				if (l.ok && l.value.root !== null) setCommits(l.value.commits);
			}, [cwd]);

			/** Directory-list refresh for the tree root. */
			const fsRefresh = react.useCallback(async () => {
				if (cwd === void 0 || cwd === "") return;
				const l = await post("/dsh-layout/fs-list", { path: cwd });
				if (l.ok) setDirCache((c) => ({ ...c, [cwd]: l.value.entries }));
			}, [cwd]);

			const refresh = react.useCallback(async () => {
				setLoading(true);
				await Promise.all([gitRefresh(), fsRefresh()]);
				setLoading(false);
			}, [gitRefresh, fsRefresh]);

			react.useEffect(() => {
				setDirCache({});
				setExpanded({});
				setView("tree");
				setSwitchError("");
				refresh();
			}, [refresh]);

			// Poll git state so badges/branch/history stay live while the
			// panel is mounted (files change under agent tool calls).
			react.useEffect(() => {
				const timer = setInterval(() => {
					gitRefresh();
				}, 5000);
				return () => clearInterval(timer);
			}, [gitRefresh]);

			// Aggregate per-directory change counts (Explorer-style): every
			// changed file marks all of its ancestor directories, so a
			// collapsed folder shows red when anything inside it changed.
			const dirStatus = react.useMemo(() => {
				const dirty = new Map();
				for (const rel of Object.keys(gitFiles)) {
					let i = rel.lastIndexOf("/");
					while (i > 0) {
						const dir = rel.slice(0, i);
						dirty.set(dir, (dirty.get(dir) ?? 0) + 1);
						i = dir.lastIndexOf("/");
					}
				}
				return dirty;
			}, [gitFiles]);

			const toggle = async (path) => {
				if (expanded[path]) {
					setExpanded((e) => ({ ...e, [path]: false }));
					return;
				}
				if (dirCache[path] === void 0) {
					const r = await post("/dsh-layout/fs-list", { path });
					if (r.ok) setDirCache((c) => ({ ...c, [path]: r.value.entries }));
				}
				setExpanded((e) => ({ ...e, [path]: true }));
			};

			const onSwitch = async (name) => {
				if (cwd === void 0 || cwd === "" || name === branch) return;
				setSwitching(true);
				setSwitchError("");
				const r = await post("/dsh-layout/git-switch", { path: cwd, branch: name });
				if (r.ok) {
					setBranch(name);
					await gitRefresh();
				} else {
					setSwitchError(r.error?.message ?? "switch failed");
				}
				setSwitching(false);
			};

			const renderEntries = (entries, prefix, depth) => {
				if (entries === void 0 || entries === null) return null;
				return entries.map((entry) => {
					const rel = prefix === "" ? entry.name : prefix + "/" + entry.name;
					const full = cwd.replace(/\\/g, "/") + "/" + rel;
					if (entry.dir) {
						const isOpen = expanded[full] === true;
						const dirty = dirStatus.get(rel);
						return react_jsx_runtime.jsxs(react.Fragment, {
							key: full,
							children: [
							react_jsx_runtime.jsxs("div", {
								className: "dsh-layout-tree-row",
								style: { paddingLeft: 6 + depth * 14 },
								onClick: () => toggle(full),
								children: [
									react_jsx_runtime.jsx("span", { children: isOpen ? "▾" : "▸" }),
									react_jsx_runtime.jsx("span", {
										className: "dsh-layout-tree-name dsh-layout-tree-dir" + (dirty !== void 0 ? " dsh-layout-tree-dirty" : ""),
										title: dirty !== void 0 ? rel + " 内有 " + String(dirty) + " 个文件改动" : rel + " 无改动",
										children: entry.name
									})
								]
							}),
							isOpen ? renderEntries(dirCache[full], rel, depth + 1) : null
						] });
					}
					const fstatus = gitFiles[rel];
					return react_jsx_runtime.jsxs("div", {
						key: full,
						className: "dsh-layout-tree-row",
						style: { paddingLeft: 6 + depth * 14 },
						children: [
							react_jsx_runtime.jsx("span", { children: " " }),
							react_jsx_runtime.jsx("span", {
								className: "dsh-layout-tree-name" + (fstatus !== void 0 ? " dsh-layout-tree-git-" + fstatus : ""),
								title: fstatus !== void 0 ? fstatus + "  " + rel : rel,
								children: entry.name
							})
						]
					});
				});
			};

			const CommitRowLocal = CommitRow;
			const rootName = cwd === void 0 || cwd === "" ? "" : cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
			const rootEntries = dirCache[cwd];

			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
				react_jsx_runtime.jsxs("div", { className: "dsh-layout-header", children: [
					react_jsx_runtime.jsx("span", { title: cwd, children: rootName }),
					react_jsx_runtime.jsx("button", {
						className: "dsh-layout-header-btn",
						onClick: () => {
							refresh();
						},
						children: loading ? "…" : "⟳"
					})
				] }),
				branch !== null ? react_jsx_runtime.jsxs("div", { className: "dsh-layout-gitbar", children: [
					react_jsx_runtime.jsx("select", {
						className: "dsh-layout-branch-select",
						value: branch,
						disabled: switching,
						title: "切换分支",
						onChange: (e) => onSwitch(e.target.value),
						children: (branches.length === 0 && branch !== null ? [{ name: branch, current: true }] : branches).map((b) => react_jsx_runtime.jsx("option", { value: b.name, children: b.name + (b.current ? " (当前)" : "") }, b.name))
					}),
					switchError !== "" ? react_jsx_runtime.jsx("div", { className: "dsh-layout-gitbar-err", children: truncate(switchError, 80) }) : null
				] }) : null,
				react_jsx_runtime.jsxs("div", { className: "dsh-layout-tabs", children: [
					react_jsx_runtime.jsx("button", {
						className: "dsh-layout-tab-btn" + (view === "tree" ? " dsh-layout-tab-btn-active" : ""),
						onClick: () => setView("tree"),
						children: "文件"
					}),
					react_jsx_runtime.jsx("button", {
						className: "dsh-layout-tab-btn" + (view === "history" ? " dsh-layout-tab-btn-active" : ""),
						onClick: () => setView("history"),
						children: "历史"
					})
				] }),
				view === "history"
					? react_jsx_runtime.jsx("div", {
						className: "dsh-layout-body",
						children: commits.length === 0
							? react_jsx_runtime.jsx("div", { className: "dsh-layout-empty", children: branch === null ? "非 git 仓库" : "暂无提交" })
							: commits.map((c) => react_jsx_runtime.jsx(CommitRowLocal, { commit: c }, c.hash))
					})
					: react_jsx_runtime.jsx("div", { className: "dsh-layout-body", children: renderEntries(rootEntries, "", 0) })
			] });
		}

		// ------------------------------------------------------------------
		// Right panel: tool calls + think blocks, live from the chat store
		// ------------------------------------------------------------------
		function ToolBlock({ block, depth }) {
			const [open, setOpen] = react.useState(false);
			const model = blockModel(block);
			const result = model.done ? resultSummary(block) : "";
			const subCalls = block.subCalls ?? [];
			return react_jsx_runtime.jsxs("div", { className: "dsh-layout-tool-card", children: [
				react_jsx_runtime.jsxs("div", {
					className: "dsh-layout-tool-row",
					style: { paddingLeft: 8 + depth * 12 },
					onClick: () => setOpen(!open),
					children: [
						react_jsx_runtime.jsx("span", { className: "dsh-layout-dot " + model.state }),
						react_jsx_runtime.jsx("span", { className: "dsh-layout-tool-name", children: model.name || "tool" }),
						react_jsx_runtime.jsx("span", { className: "dsh-layout-tool-state", children: model.state })
					]
				}),
				open ? react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
					model.argsRaw !== "" ? react_jsx_runtime.jsx("pre", { className: "dsh-layout-code", children: truncate(model.argsRaw, 800) }) : null,
					model.errorText !== "" ? react_jsx_runtime.jsx("pre", { className: "dsh-layout-code dsh-layout-err", children: truncate(model.errorText, 400) }) : null,
					result !== "" ? react_jsx_runtime.jsx("pre", { className: "dsh-layout-code", children: truncate(result, 800) }) : null
				] }) : null,
				subCalls.map((sub) => react_jsx_runtime.jsx(ToolBlock, { block: sub, depth: depth + 1 }, sub.callId))
			] });
		}

		function ThinkBlock({ blocks, running }) {
			const [open, setOpen] = react.useState(false);
			const text = blocks.map((b) => b.text).join("");
			return react_jsx_runtime.jsxs("div", { className: "dsh-layout-think", children: [
				react_jsx_runtime.jsxs("div", {
					className: "dsh-layout-think-header",
					onClick: () => setOpen(!open),
					children: [
						react_jsx_runtime.jsx("span", { className: "dsh-layout-dot think" }),
						react_jsx_runtime.jsx("span", { children: "Think" + (running ? "…" : "") })
					]
				}),
				open
					? react_jsx_runtime.jsx("pre", { className: "dsh-layout-code", children: truncate(text, 2000) })
					: text !== "" ? react_jsx_runtime.jsx("div", { className: "dsh-layout-think-summary", children: firstLine(text) }) : null
			] });
		}

		function ActivityPanel({ sessionId, useSession }) {
			const order = useSession((s) => s.chat.order);
			const nodes = useSession((s) => s.chat.nodes);
			const listRef = react.useRef(null);
			const items = react.useMemo(() => {
				const out = [];
				if (order === void 0 || nodes === void 0) return out;
				for (const key of order) {
					const node = nodes.get(key);
					if (node === void 0) continue;
					if (node.kind === "tool-call") {
						out.push({ type: "tool", node });
					} else if (node.kind === "assistant-step") {
						const blocks = node.data?.blocks ?? [];
						const reasonings = blocks.filter((b) => b.kind === "reasoning");
						if (reasonings.length > 0) {
							out.push({ type: "think", node, blocks: reasonings, running: node.data?.status === "running" });
						}
					}
				}
				return out;
			}, [order, nodes]);
			react.useEffect(() => {
				const el = listRef.current;
				if (el !== null) el.scrollTop = el.scrollHeight;
			}, [items.length]);
			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
				react_jsx_runtime.jsxs("div", { className: "dsh-layout-header", children: [
					react_jsx_runtime.jsx("span", { children: "Tools" }),
					react_jsx_runtime.jsx("span", { className: "dsh-layout-tool-state", children: String(items.length) })
				] }),
				react_jsx_runtime.jsx("div", {
					className: "dsh-layout-body",
					ref: listRef,
					children: items.length === 0
						? react_jsx_runtime.jsx("div", { className: "dsh-layout-empty", children: "—" })
						: items.map((item, index) => {
							if (item.type === "tool") {
								const block = item.node.data?.root;
								return block === void 0 ? null : react_jsx_runtime.jsx(ToolBlock, { block, depth: 0 }, item.node.key ?? index);
							}
							return react_jsx_runtime.jsx(ThinkBlock, { blocks: item.blocks, running: item.running }, item.node.key ?? index);
						})
				})
			] });
		}

		function FontControl() {
			const [size, setSize] = react.useState(() => {
				const v = Number(localStorage.getItem("dsh-layout-tools.chatFontSize"));
				return Number.isFinite(v) && v >= 12 && v <= 28 ? v : 16;
			});
			react.useEffect(() => {
				document.body.style.setProperty("--dsh-chat-font-size", String(size) + "px");
				localStorage.setItem("dsh-layout-tools.chatFontSize", String(size));
			}, [size]);
			const step = (d) => setSize((s) => Math.min(28, Math.max(12, s + d)));
			return react_jsx_runtime.jsxs("div", { className: "dsh-layout-fontctl", children: [
				react_jsx_runtime.jsx("button", { className: "dsh-layout-fontbtn", onClick: () => step(-1), title: "减小对话字体", children: "A−" }),
				react_jsx_runtime.jsx("span", { className: "dsh-layout-fontval", children: String(size) }),
				react_jsx_runtime.jsx("button", { className: "dsh-layout-fontbtn", onClick: () => step(1), title: "增大对话字体", children: "A+" })
			] });
		}

		// ------------------------------------------------------------------
		// Panels seat (conversation.input.dock list entry, session-scoped)
		// ------------------------------------------------------------------
		function Panels({ sessionId, useSession, useSessions }) {
			// Defense: render only for the session the UI currently shows. The
			// official shell renders one session subtree at a time, but a stale
			// slot incarnation must never paint panels for the wrong session.
			const current = useSessions((s) => s.current);
			if (current !== void 0 && sessionId !== void 0 && current !== sessionId) return null;
			const cwd = useSessions((s) => s.byId[sessionId]?.cwd);
			// Mirror the collapse state so the edge tabs flip their glyph —
			// the glyph shows the ACTION: ▶/◀ to expand while collapsed,
			// ◀/▶ to collapse while open (left panel: expand ▶, collapse ◀;
			// right panel mirrored).
			const [leftOpen, setLeftOpen] = react.useState(() => document.body.dataset.dshLayoutLeft !== "off");
			const [rightOpen, setRightOpen] = react.useState(() => document.body.dataset.dshLayoutRight !== "off");
			react.useEffect(() => {
				const mo = new MutationObserver(() => {
					setLeftOpen(document.body.dataset.dshLayoutLeft !== "off");
					setRightOpen(document.body.dataset.dshLayoutRight !== "off");
				});
				mo.observe(document.body, { attributes: true, attributeFilter: ["data-dsh-layout-left", "data-dsh-layout-right"] });
				return () => mo.disconnect();
			}, []);
			const toggleLeft = () => {
				const off = document.body.dataset.dshLayoutLeft === "off";
				document.body.dataset.dshLayoutLeft = off ? "on" : "off";
				setLeftOpen(off);
			};
			const toggleRight = () => {
				const off = document.body.dataset.dshLayoutRight === "off";
				document.body.dataset.dshLayoutRight = off ? "on" : "off";
				setRightOpen(off);
			};
			// Fit guard: when the viewport is too narrow for the expanded panels
			// to leave the conversation column ~748px, auto-collapse both panels
			// (collapse-only; manual expand is never undone unless a resize
			// actually squeezes the viewport again). This keeps user messages
			// from being covered by the floating panels.
			react.useEffect(() => {
				const check = () => {
					if (window.innerWidth < 1950) {
						document.body.dataset.dshLayoutLeft = "off";
						document.body.dataset.dshLayoutRight = "off";
					}
				};
				check();
				window.addEventListener("resize", check);
				return () => window.removeEventListener("resize", check);
			}, []);
			// Track the official sidebar column width so the left panel follows
			// it when the built-in sidebar is collapsed/resized (the frame's
			// first grid child is the sidebar column).
			react.useEffect(() => {
				const frame = document.querySelector('#root > div[data-slot="root"] > div');
				if (frame === null) return;
				const col = frame.firstElementChild;
				const apply = () => {
					const w = col instanceof HTMLElement ? col.offsetWidth : 280;
					document.body.style.setProperty("--dsh-layout-left-offset", String(w) + "px");
				};
				apply();
				if (!(col instanceof HTMLElement)) return;
				const ro = new ResizeObserver(apply);
				ro.observe(col);
				return () => ro.disconnect();
			}, []);
			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
				react_jsx_runtime.jsx("div", { className: "dsh-layout-panel dsh-layout-panel-left", children: cwd === void 0 || cwd === "" ? react_jsx_runtime.jsx("div", { className: "dsh-layout-empty", children: "…" }) : react_jsx_runtime.jsx(FileTree, { cwd }) }),
				react_jsx_runtime.jsx("div", { className: "dsh-layout-panel dsh-layout-panel-right", children: react_jsx_runtime.jsx(ActivityPanel, { sessionId, useSession }) }),
				react_jsx_runtime.jsx("div", { className: "dsh-layout-tab dsh-layout-tab-left", onClick: toggleLeft, children: leftOpen ? "◀" : "▶" }),
				react_jsx_runtime.jsx("div", { className: "dsh-layout-tab dsh-layout-tab-right", onClick: toggleRight, children: rightOpen ? "▶" : "◀" }),
				react_jsx_runtime.jsx(FontControl, {})
			] });
		}

		// ------------------------------------------------------------------
		// Plugin body
		// ------------------------------------------------------------------
		/** Required services. */
		const inject = ["slots", "conversation", "sessions", "locale"];

		function apply(ctx) {
			injectCss();
			// Conversation-area layout patch, structure-agnostic and independent
			// of any panel mounting: walk up from a chat node to the element
			// that defines --dsh-chat-content-width (the conversation root),
			// widen it to fill the column, and give the column margin room for
			// the floating panels. Margins follow the panel collapse state; a
			// MutationObserver re-applies after session switches remount the
			// conversation tree.
			ctx.effect(() => {
				const CHAT_WIDTH = "1600px";
				let currentRoot = null;
				let columnEl = null;
				const findColumn = (root) => {
					let el = root.parentElement;
					while (el !== null && el !== document.body && el !== document.documentElement) {
						const ps = getComputedStyle(el.parentElement);
						if (ps.display === "grid" || ps.display.includes("grid")) return el;
						el = el.parentElement;
					}
					return null;
				};
				const syncMargins = () => {
					if (currentRoot === null) return;
					const leftOff = document.body.dataset.dshLayoutLeft === "off";
					const rightOff = document.body.dataset.dshLayoutRight === "off";
					const ml = leftOff ? "0px" : "240px";
					const mr = rightOff ? "0px" : "300px";
					if (columnEl !== null) {
						if (columnEl.style.marginLeft !== ml) columnEl.style.marginLeft = ml;
						if (columnEl.style.marginRight !== mr) columnEl.style.marginRight = mr;
					} else {
						if (currentRoot.style.paddingLeft !== ml) currentRoot.style.paddingLeft = ml;
						if (currentRoot.style.paddingRight !== mr) currentRoot.style.paddingRight = mr;
					}
				};
				const apply = () => {
					// Anchor on the official scroll container: it is a strict
					// ancestor of the content column, so a variable set on it
					// (or above it) is always visible to the column. Walk up
					// to the first ancestor that also contains the composer
					// textarea so the input bar widens together with the flow.
					const anchor = document.querySelector("[data-chat-anchor-key]");
					let scroll = anchor === null ? null : anchor.closest("[data-conversation-scroll]");
					if (scroll === null) scroll = document.querySelector("[data-conversation-scroll]");
					let target = null;
					if (scroll !== null) {
						let el = scroll;
						while (el !== null && el !== document.body) {
							if (el.querySelector("textarea") !== null) {
								target = el;
								break;
							}
							el = el.parentElement;
						}
						if (target === null) target = scroll;
					} else if (anchor !== null) {
						let el = anchor;
						while (el !== null) {
							const v = getComputedStyle(el).getPropertyValue("--dsh-chat-content-width");
							if (v !== undefined && v.trim() !== "") {
								target = el;
								break;
							}
							el = el.parentElement;
						}
					} else {
						// hero/blank: widen the centered composer card.
						const all = document.querySelectorAll("#root *");
						for (let i = 0; i < all.length; i++) {
							const cs = getComputedStyle(all[i]);
							if (cs.maxWidth !== "none" && cs.marginLeft === "auto") {
								target = all[i];
								break;
							}
						}
					}
					if (target === null) {
						currentRoot = null;
						columnEl = null;
						return;
					}
					if (target !== currentRoot) {
						currentRoot = target;
						target.style.setProperty("--dsh-chat-content-width", CHAT_WIDTH);
						columnEl = findColumn(target);
					}
					syncMargins();
				};
				apply();
				const mo = new MutationObserver(apply);
				mo.observe(document.body, { childList: true, subtree: true });
				const omo = new MutationObserver(syncMargins);
				omo.observe(document.body, { attributes: true, attributeFilter: ["data-dsh-layout-left", "data-dsh-layout-right"] });
				return () => {
					mo.disconnect();
					omo.disconnect();
				};
			}, "dsh-layout-tools: chat layout patch");
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-layout-tools: dictionaries");
			ctx.inject(["slots", "conversation", "sessions"], (scope) => {
				// Shadow the official tool-call / tool-result flow renderers
				// (priority -1 renders before the default 0).
				scope.slots.inject("conversation.chat.node", () => scope.slots.register({
					name: "conversation.chat.node",
					key: "tool-call",
					priority: -1,
					locale: NS
				}, NullView));
				scope.slots.inject("conversation.chat.node", () => scope.slots.register({
					name: "conversation.chat.node",
					key: "tool-result",
					priority: -1,
					locale: NS
				}, NullView));
				// The layout panels as a session dock entry (list; never a view
				// tab, so the official view switcher is untouched).
				scope.slots.inject("conversation.input.dock", () => scope.slots.register({
					name: "conversation.input.dock",
					id: "dsh-layout-panels",
					order: 100,
					locale: NS
				}, Panels));
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
