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
body { --dsh-layout-left: 240px; --dsh-layout-right: 300px; }
#root > div[data-slot="root"] > div > div:nth-child(2) {
  margin-left: var(--dsh-layout-left, 0px);
  margin-right: var(--dsh-layout-right, 0px);
  transition: margin-left var(--ds-transition-duration-slow, .2s) var(--ds-ease-in-out, ease), margin-right var(--ds-transition-duration-slow, .2s) var(--ds-ease-in-out, ease);
}
body[data-dsh-layout-left="off"] { --dsh-layout-left: 0px; }
body[data-dsh-layout-right="off"] { --dsh-layout-right: 0px; }
.dsh-layout-panel {
  position: fixed; top: 0; bottom: 0; z-index: 12;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l1);
  display: flex; flex-direction: column; min-width: 0;
  transition: transform var(--ds-transition-duration-slow, .2s) var(--ds-ease-in-out, ease);
}
.dsh-layout-panel-left { left: 280px; width: 240px; border-left: none; border-right: none; box-shadow: 4px 0 16px var(--dsw-alias-bg-mask-2, rgba(0,0,0,.08)); }
.dsh-layout-panel-right { right: 0; width: 300px; border-right: none; border-left: none; box-shadow: -4px 0 16px var(--dsw-alias-bg-mask-2, rgba(0,0,0,.08)); }
body[data-dsh-layout-left="off"] .dsh-layout-panel-left { display: none; }
body[data-dsh-layout-right="off"] .dsh-layout-panel-right { transform: translateX(100%); }
.dsh-layout-tab {
  position: fixed; top: 50%; transform: translateY(-50%);
  width: 18px; height: 64px; z-index: 12;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  cursor: pointer; font-size: 11px; line-height: 1;
  display: none; align-items: center; justify-content: center;
}
.dsh-layout-tab:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-layout-tab-left { left: 280px; border-left: none; border-radius: 0 8px 8px 0; }
.dsh-layout-tab-right { right: 0; border-right: none; border-radius: 8px 0 0 8px; }
body[data-dsh-layout-left="off"] .dsh-layout-tab-left { display: flex; }
body[data-dsh-layout-right="off"] .dsh-layout-tab-right { display: flex; }
.dsh-layout-header {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary);
}
.dsh-layout-header-btn {
  margin-left: auto; cursor: pointer; user-select: none;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-button-tool-bar-fill);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px;
  font-size: 12px; padding: 2px 8px;
}
.dsh-layout-header-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-body { flex: 1; min-height: 0; overflow: auto; padding: 6px 4px; font-size: 13px; }
.dsh-layout-tree-row {
  display: flex; align-items: center; gap: 5px; padding: 2px 6px;
  border-radius: 6px; cursor: pointer; white-space: nowrap; min-width: 0;
  color: var(--dsw-alias-label-primary);
}
.dsh-layout-tree-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-layout-tree-name { overflow: hidden; text-overflow: ellipsis; }
.dsh-layout-tree-dir { color: var(--dsw-alias-label-primary); font-weight: 500; }
.dsh-layout-git-badge {
  margin-left: auto; flex: none; font-size: 11px; line-height: 1;
  padding: 2px 5px; border-radius: 999px; font-family: var(--ds-font-family-code, monospace);
}
.dsh-layout-git-M, .dsh-layout-git-T { background: rgba(229, 177, 58, .18); color: #e5b13a; }
.dsh-layout-git-A { background: rgba(87, 171, 90, .18); color: #57ab5a; }
.dsh-layout-git-D { background: rgba(229, 92, 92, .18); color: #e55c5c; }
.dsh-layout-git-R, .dsh-layout-git-C { background: rgba(88, 166, 255, .18); color: #58a6ff; }
.dsh-layout-git-U, .dsh-layout-git-! { background: rgba(229, 92, 92, .25); color: #ff7b72; }
.dsh-layout-git-?? { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-tertiary); }
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
.dsh-layout-tool-state { margin-left: auto; font-size: 11px; color: var(--dsw-alias-label-tertiary); flex: none; }
.dsh-layout-code {
  margin: 0 10px 8px; padding: 8px 10px; border-radius: 8px;
  background: var(--dsw-alias-markdown-code-block);
  color: var(--dsw-alias-label-primary); font-family: var(--ds-font-family-code, monospace);
  font-size: 12px; line-height: 18px; white-space: pre-wrap; word-break: break-word;
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
  font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dsh-layout-cwd {
  padding: 4px 12px 6px; font-size: 11px; line-height: 1.4;
  color: var(--dsw-alias-label-tertiary);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dsh-layout-empty { color: var(--dsw-alias-label-tertiary); text-align: center; padding: 24px 0; font-size: 13px; }
@media (max-width: 1700px) {
  .dsh-layout-panel { display: none !important; }
  .dsh-layout-tab { display: none !important; }
  #root > div[data-slot="root"] > div > div:nth-child(2) { margin-left: 0; margin-right: 0; }
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
		function GitBadge({ status }) {
			if (status === void 0) return null;
			const label = status === "??" ? "??" : status;
			return react_jsx_runtime.jsx("span", { className: "dsh-layout-git-badge dsh-layout-git-" + status, children: label });
		}

		function FileTree({ cwd }) {
			const [dirCache, setDirCache] = react.useState({});
			const [expanded, setExpanded] = react.useState({});
			const [gitFiles, setGitFiles] = react.useState({});
			const [branch, setBranch] = react.useState(null);
			const [loading, setLoading] = react.useState(false);

			const refresh = react.useCallback(async () => {
				if (cwd === void 0 || cwd === "") return;
				setLoading(true);
				const [s, l] = await Promise.all([
					post("/dsh-layout/git-status", { path: cwd }),
					post("/dsh-layout/fs-list", { path: cwd })
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
				}
				if (l.ok) setDirCache((c) => ({ ...c, [cwd]: l.value.entries }));
				setLoading(false);
			}, [cwd]);

			react.useEffect(() => {
				setDirCache({});
				setExpanded({});
				refresh();
			}, [refresh]);

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

			const renderEntries = (entries, prefix, depth) => {
				if (entries === void 0 || entries === null) return null;
				return entries.map((entry) => {
					const rel = prefix === "" ? entry.name : prefix + "/" + entry.name;
					const full = cwd.replace(/\\/g, "/") + "/" + rel;
					if (entry.dir) {
						const isOpen = expanded[full] === true;
						return react_jsx_runtime.jsxs(react.Fragment, {
							key: full,
							children: [
							react_jsx_runtime.jsxs("div", {
								className: "dsh-layout-tree-row",
								style: { paddingLeft: 6 + depth * 14 },
								onClick: () => toggle(full),
								children: [
									react_jsx_runtime.jsx("span", { children: isOpen ? "▾" : "▸" }),
									react_jsx_runtime.jsx("span", { className: "dsh-layout-tree-name dsh-layout-tree-dir", children: entry.name })
								]
							}),
							isOpen ? renderEntries(dirCache[full], rel, depth + 1) : null
						] });
					}
					return react_jsx_runtime.jsxs("div", {
						key: full,
						className: "dsh-layout-tree-row",
						style: { paddingLeft: 6 + depth * 14 },
						children: [
							react_jsx_runtime.jsx("span", { children: " " }),
							react_jsx_runtime.jsx("span", { className: "dsh-layout-tree-name", children: entry.name }),
							react_jsx_runtime.jsx(GitBadge, { status: gitFiles[rel] })
						]
					});
				});
			};

			const rootName = cwd === void 0 || cwd === "" ? "" : cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
			const rootEntries = dirCache[cwd];

			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
				react_jsx_runtime.jsxs("div", { className: "dsh-layout-header", children: [
					react_jsx_runtime.jsx("span", { title: cwd, children: rootName }),
					branch !== null ? react_jsx_runtime.jsx("span", { className: "dsh-layout-git-badge dsh-layout-git-M", children: branch }) : null,
					react_jsx_runtime.jsx("button", {
						className: "dsh-layout-header-btn",
						onClick: () => {
							refresh();
						},
						children: loading ? "…" : "⟳"
					}),
					react_jsx_runtime.jsx("button", {
						className: "dsh-layout-header-btn",
						onClick: () => {
							const off = document.body.dataset.dshLayoutLeft === "off";
							document.body.dataset.dshLayoutLeft = off ? "on" : "off";
						},
						children: "«"
					})
				] }),
				react_jsx_runtime.jsx("div", {
					className: "dsh-layout-cwd",
					title: cwd,
					children: cwd
				}),
				react_jsx_runtime.jsx("div", { className: "dsh-layout-body", children: renderEntries(rootEntries, "", 0) })
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
					react_jsx_runtime.jsx("span", { className: "dsh-layout-tool-state", children: String(items.length) }),
					react_jsx_runtime.jsx("button", {
						className: "dsh-layout-header-btn",
						onClick: () => {
							const off = document.body.dataset.dshLayoutRight === "off";
							document.body.dataset.dshLayoutRight = off ? "on" : "off";
						},
						children: "»"
					})
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
			const toggleLeft = () => {
				const off = document.body.dataset.dshLayoutLeft === "off";
				document.body.dataset.dshLayoutLeft = off ? "on" : "off";
			};
			const toggleRight = () => {
				const off = document.body.dataset.dshLayoutRight === "off";
				document.body.dataset.dshLayoutRight = off ? "on" : "off";
			};
			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: [
				react_jsx_runtime.jsx("div", { className: "dsh-layout-panel dsh-layout-panel-left", children: cwd === void 0 || cwd === "" ? react_jsx_runtime.jsx("div", { className: "dsh-layout-empty", children: "…" }) : react_jsx_runtime.jsx(FileTree, { cwd }) }),
				react_jsx_runtime.jsx("div", { className: "dsh-layout-panel dsh-layout-panel-right", children: react_jsx_runtime.jsx(ActivityPanel, { sessionId, useSession }) }),
				react_jsx_runtime.jsx("div", { className: "dsh-layout-tab dsh-layout-tab-left", onClick: toggleLeft, children: "▶" }),
				react_jsx_runtime.jsx("div", { className: "dsh-layout-tab dsh-layout-tab-right", onClick: toggleRight, children: "◀" })
			] });
		}

		// ------------------------------------------------------------------
		// Plugin body
		// ------------------------------------------------------------------
		/** Required services. */
		const inject = ["slots", "conversation", "sessions", "locale"];

		function apply(ctx) {
			injectCss();
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
