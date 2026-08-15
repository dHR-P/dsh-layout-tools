/**
 * dsh-layout-tools — client half (hand-written __ModuleLoader__ bundle).
 *
 * Layout overhaul for the DSH web GUI:
 *  - conversation flow: tool-call / tool-result nodes are removed from the
 *    center column (keyed-slot shadow at priority -1 + CSS belt-and-suspenders);
 *    the model's think blocks stay visible in the flow (official ReasoningRow)
 *  - left panel: workspace file tree with git-change badges
 *  - font control: conversation font A−/A+ (bottom-right)
 *  - tool calls are inspected through the official trajectory view
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
		let react_dom = require("react-dom");

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
/* Hide the official turn/step stats line (StatsLine) — replaced by the
   plugin's balance status bar below. Class is the rc.6 module hash. */
.FJxK0a_root { display: none !important; }
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
body { --dsh-layout-left: 240px; --dsh-layout-right: 0px; }
body[data-dsh-layout-left="off"] { --dsh-layout-left: 0px; }
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
.dsh-layout-balance {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex-wrap: wrap;
}
.dsh-layout-balance .dsh-layout-header-btn { font-size: 0.6875rem; padding: 0 4px; }
.dsh-layout-balance-item { white-space: nowrap; font-size: 0.6875rem; }
.dsh-layout-balance-err { color: var(--dsw-alias-state-error-primary); font-size: 0.6875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Conversation-bottom status row: rendered INSIDE the official StatsLine's
   container (createPortal) so it sits exactly where the official line was —
   below the composer. */
.dsh-layout-statusbar {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 12px; line-height: 20px; color: var(--dsw-alias-label-tertiary);
  max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  padding: 2px 4px;
}
.dsh-layout-statusbar-refresh {
  background: none; border: none; color: inherit; cursor: pointer;
  font-size: 12px; line-height: 20px; padding: 0; flex: none;
}
.dsh-layout-statusbar-refresh:hover { color: var(--dsw-alias-label-primary); }
.dsh-layout-statusbar-err { color: var(--dsw-alias-state-error-primary); }
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

		/** Format a numeric balance value. */
		function fmtNum(value) {
			const n = Number(value);
			return Number.isFinite(n) ? n.toFixed(2) : String(value ?? "");
		}

		// ---- Official StatsLine helpers (reused for the replacement row) ----
		function usageOutputTokens(usage) {
			if (typeof usage !== "object" || usage === null) return null;
			const value = usage.outputTokens;
			return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
		}
		function assistantStepReading(node) {
			const timing = node.timing;
			return {
				ttftMs: timing !== void 0 && timing.stepStartTime !== null && timing.firstTokenTime !== null ? Math.max(0, timing.firstTokenTime - timing.stepStartTime) : null,
				decodeMs: timing !== void 0 && timing.firstTokenTime !== null ? Math.max(0, timing.completedTime - timing.firstTokenTime) : null,
				outputTokens: usageOutputTokens(node.usage)
			};
		}
		function deriveStats(nodes) {
			const turns = new Set();
			let steps = 0, llmMs = 0, toolMs = 0, ttftMs = 0, ttftSteps = 0, decodeMs = 0, decodeTokens = 0;
			for (const node of nodes) {
				if (node.kind === "tool-result") {
					if (node.callTime !== null) toolMs += Math.max(0, node.time - node.callTime);
					continue;
				}
				if (node.kind !== "assistant") continue;
				turns.add(node.turn);
				steps += 1;
				if (node.timing !== void 0 && node.timing.stepStartTime !== null) llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime);
				const reading = assistantStepReading(node);
				if (reading.ttftMs !== null) { ttftMs += reading.ttftMs; ttftSteps += 1; }
				if (reading.decodeMs !== null && reading.outputTokens !== null) { decodeMs += reading.decodeMs; decodeTokens += reading.outputTokens; }
			}
			return { turns: turns.size, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens };
		}
		function formatDuration(ms) {
			const s = ms / 1e3;
			if (s < 60) return `${Math.round(s * 10) / 10}s`;
			const whole = Math.round(s);
			return `${Math.floor(whole / 60)}m${whole % 60}s`;
		}
		function formatTokens(n) {
			const scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
			if (n < 1e3) return String(n);
			if (n < 1e6) return `${scaled(n / 1e3)}K`;
			return `${scaled(n / 1e6)}M`;
		}
		function formatTokensPerSecond(tps) {
			const clamped = Math.max(0, tps);
			return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
		}
		function billedInputTokens(usage) {
			return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
		}
		function cacheHitPercent(usage) {
			const denominator = billedInputTokens(usage);
			return denominator === 0 ? null : Math.round(usage.cacheReadTokens / denominator * 100);
		}
		// ---- end official StatsLine helpers ----

		/**
		 * Conversation-bottom status row: replaces the official StatsLine. The
		 * turn/step counter is replaced by the current provider's balance/usage;
		 * durations, speeds, and token accounting are kept (same data as the
		 * official line). Fixed above the composer at the StatsLine position.
		 */
		function StatsBar({ sessionId, useSession, useProjection }) {
			const nodes = useSession((s) => s.chat.legacy.nodes);
			const usage = useProjection !== void 0 ? useProjection("tokenUsage") : void 0;
			const [balance, setBalance] = react.useState(null);
			const [err, setErr] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const load = react.useCallback(async () => {
				setBusy(true);
				setErr("");
				try {
					let prov = null;
					if (sessionId !== void 0 && sessionId !== "") {
						const r = await fetch("/api/session.models", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ type: "client-request", method: "session.models", rpcId: crypto.randomUUID(), payload: { sessionId } })
						});
						const j = await r.json();
						prov = j?.result?.value?.current?.provider ?? null;
					}
					if (prov === null) { setBalance(null); setBusy(false); return; }
					const kind = prov.toLowerCase().includes("opencode") ? "opencode-go"
						: prov.toLowerCase().includes("deepseek") ? "deepseek"
							: null;
					if (kind === null) { setBalance(null); setBusy(false); return; }
					const b = await post("/dsh-layout/balance", { type: kind });
					if (b.ok) { setBalance(b.value); setErr(""); }
					else { setBalance(null); setErr(b.error?.message ?? "查询失败"); }
				} catch {
					setBalance(null);
					setErr("查询失败");
				}
				setBusy(false);
			}, [sessionId]);
			react.useEffect(() => { load(); }, [load]);
			// Render INSIDE the official StatsLine container (createPortal) so the
			// row sits exactly where the official line was — below the composer.
			const [host, setHost] = react.useState(null);
			react.useEffect(() => {
				const find = () => {
					const el = document.querySelector(".FJxK0a_root");
					setHost(el !== null && el.parentElement !== null ? el.parentElement : null);
				};
				find();
				const mo = new MutationObserver(find);
				mo.observe(document.body, { childList: true, subtree: true });
				return () => mo.disconnect();
			}, []);
			const stats = react.useMemo(() => deriveStats(nodes), [nodes]);
			const groups = [];
			// 余额/用量 replaces the turn/step counter.
			if (balance?.kind === "deepseek") {
				groups.push("DS " + balance.balances.map((b) => (b.currency === "CNY" ? "¥" : "$") + fmtNum(b.total)).join(" / "));
			} else if (balance?.kind === "opencode-go") {
				groups.push("OC " + ["rolling", "weekly", "monthly"].map((k) => (balance.usage[k] ? balance.usage[k].percent + "%" : "-")).join("/"));
			} else if (err !== "") {
				groups.push("余额不可用");
			}
			if (stats.steps > 0) {
				const durations = [];
				if (stats.llmMs > 0) durations.push("LLM " + formatDuration(stats.llmMs));
				if (stats.toolMs > 0) durations.push("工具 " + formatDuration(stats.toolMs));
				if (durations.length > 0) groups.push(durations.join(" · "));
				const speeds = [];
				if (stats.ttftSteps > 0) speeds.push("TTFT " + formatDuration(stats.ttftMs / stats.ttftSteps));
				if (stats.decodeMs > 0) speeds.push("解码 " + formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1e3)) + " tok/s");
				if (speeds.length > 0) groups.push(speeds.join(" · "));
			}
			if (usage !== void 0 && (billedInputTokens(usage) > 0 || usage.outputTokens > 0)) {
				const cacheHit = cacheHitPercent(usage);
				if (cacheHit !== null) groups.push("缓存 " + cacheHit + "%");
				groups.push("输入 " + formatTokens(billedInputTokens(usage)) + " / 输出 " + formatTokens(usage.outputTokens));
			}
			if (groups.length === 0) return null;
			const line = groups.join(" | ");
			const content = react_jsx_runtime.jsxs("div", { className: "dsh-layout-statusbar", title: "当前模型余额/用量 + 会话统计", children: [
				react_jsx_runtime.jsx("button", { className: "dsh-layout-statusbar-refresh", onClick: load, title: "刷新余额", children: busy ? "…" : "⟳" }),
				react_jsx_runtime.jsx("span", { className: "dsh-layout-statusbar-text", children: line })
			] });
			return host === null ? null : react_dom.createPortal(content, host);
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

			/** Open a file with the OS default application (Notepad/VS Code/…). */
			const openFile = async (path) => {
				const r = await post("/dsh-layout/open-file", { path });
				if (!r.ok) console.warn("dsh-layout open-file:", r.error?.message ?? r.error?.code ?? "failed");
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
						onClick: () => openFile(full),
						title: "点击用系统默认程序打开" + (fstatus !== void 0 ? "（git " + fstatus + "）" : ""),
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
		function Panels({ sessionId, useSession, useSessions, useProjection }) {
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
			react.useEffect(() => {
				const mo = new MutationObserver(() => {
					setLeftOpen(document.body.dataset.dshLayoutLeft !== "off");
				});
				mo.observe(document.body, { attributes: true, attributeFilter: ["data-dsh-layout-left"] });
				return () => mo.disconnect();
			}, []);
			const toggleLeft = () => {
				const off = document.body.dataset.dshLayoutLeft === "off";
				document.body.dataset.dshLayoutLeft = off ? "on" : "off";
				setLeftOpen(off);
			};
			// Fit guard: when the viewport is too narrow for the expanded panel
			// to leave the conversation column ~748px, auto-collapse the left
			// panel (collapse-only; manual expand is never undone unless a
			// resize actually squeezes the viewport again). This keeps user
			// messages from being covered by the floating panel.
			react.useEffect(() => {
				const check = () => {
					if (window.innerWidth < 1950) {
						document.body.dataset.dshLayoutLeft = "off";
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
				react_jsx_runtime.jsx("div", { className: "dsh-layout-tab dsh-layout-tab-left", onClick: toggleLeft, children: leftOpen ? "◀" : "▶" }),
				react_jsx_runtime.jsx(FontControl, {}),
				react_jsx_runtime.jsx(StatsBar, { sessionId, useSession, useProjection })
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
					const ml = leftOff ? "0px" : "240px";
					if (columnEl !== null) {
						if (columnEl.style.marginLeft !== ml) columnEl.style.marginLeft = ml;
						if (columnEl.style.marginRight !== "0px") columnEl.style.marginRight = "0px";
					} else {
						if (currentRoot.style.paddingLeft !== ml) currentRoot.style.paddingLeft = ml;
						if (currentRoot.style.paddingRight !== "0px") currentRoot.style.paddingRight = "0px";
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
				omo.observe(document.body, { attributes: true, attributeFilter: ["data-dsh-layout-left"] });
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
