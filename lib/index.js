/**
 * dsh-layout-tools — host half.
 *
 * Workspace-gated fs + git-status routes for the layout panels:
 *   POST /dsh-layout/fs-list     { path } -> { entries: [{ name, dir }] }
 *   POST /dsh-layout/git-status  { path } -> { root, branch, files: [{ path, status }] }
 *
 * Security boundary: every requested path must resolve (realpath) inside a
 * registered workspace root — the browser can never enumerate arbitrary host
 * directories. Model-visible surface: none; these are UI-driven host reads.
 */
import { readdir, realpath } from 'node:fs/promises';
import { join, sep } from 'node:path';

/** Collected-output cap for one git command (status output fits comfortably). */
const OUTPUT_CAP_BYTES = 1 << 20;
/** Directories never shown in the file tree (VCS internals / dependency trees). */
const SKIPPED_DIRS = new Set(['.git', 'node_modules']);

/** Bounded subprocess runner over ctx.subprocess (mirrors the git-graph plugin). */
function subprocessRunner(ctx) {
	return {
		async run(argv, cwd) {
			const spec = {
				argv: ['git', ...argv],
				cwd,
				stdio: {
					stdin: 'ignore',
					stdout: { maxBytes: OUTPUT_CAP_BYTES },
					stderr: { maxBytes: OUTPUT_CAP_BYTES }
				},
				graceMs: 1e4
			};
			const handle = ctx.subprocess.spawn(spec);
			const outcome = await handle.done;
			const stdout = handle.collected.stdout?.readFrom(0).text ?? '';
			const stderr = handle.collected.stderr?.readFrom(0).text ?? '';
			return { exitCode: outcome.exitCode, stdout, stderr };
		}
	};
}

/**
 * Parse `git status --porcelain -z` (NUL-separated records). Each record is
 * "XY path"; renames/copies carry the destination as a second record.
 * Status letters: M modified, A added, D deleted, R renamed, C copied,
 * '??' untracked, 'UU' conflict. Returns [{ path, status }] with the
 * strongest single letter (or the '??' pair) kept.
 */
function parseStatusZ(stdout) {
	const files = [];
	const parts = stdout.split('\0');
	for (let i = 0; i < parts.length; i++) {
		const rec = parts[i];
		if (rec === '' || rec.length < 3) continue;
		const xy = rec.slice(0, 2);
		const path = rec.slice(3);
		if (xy[0] === 'R' || xy[0] === 'C') {
			// Next record holds the destination path.
			const dest = parts[++i];
			if (dest !== undefined) files.push({ path: dest, status: xy[0] });
		} else if (xy === '??') {
			files.push({ path, status: '??' });
		} else {
			// Index letter wins; a plain conflict is "UU".
			const status = xy[0] !== ' ' ? xy[0] : xy[1];
			files.push({ path, status });
		}
	}
	return files;
}

/** JSON envelope helpers (mirrors the git-graph plugin). */
const OK = (value) => ({ ok: true, value });
const FAIL = (error) => ({ ok: false, error });
const BAD_REQUEST = { code: 'internal', message: 'malformed request' };

/** Request body size cap. */
const BODY_CAP_BYTES = 1 << 20;

async function readJsonBody(req) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		total += chunk.length;
		if (total > BODY_CAP_BYTES) {
			req.destroy();
			return null;
		}
		chunks.push(chunk);
	}
	const text = Buffer.concat(chunks).toString('utf8');
	if (text === '') return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function pathOf(payload) {
	if (typeof payload !== 'object' || payload === null) return null;
	const path = payload.path;
	return typeof path === 'string' && path !== '' ? path : null;
}

function json(res, envelope, status = 200) {
	res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
	res.end(JSON.stringify(envelope));
}

/**
 * The workspace-membership gate: canonicalize the requested path and require
 * it to be a registered workspace root or any descendant of one. This is the
 * security boundary of the /dsh-layout routes.
 */
function createWorkspaceGate(ctx) {
	return async (path) => {
		let canonical;
		try {
			canonical = await realpath(path);
		} catch {
			return { ok: false, error: { code: 'workspace-unknown', message: 'path does not resolve on disk' } };
		}
		const roots = ctx.workspaceRegistry.list().map((workspace) => workspace.path);
		if (roots.some((root) => canonical === root || canonical.startsWith(root + sep))) {
			return { ok: true, canonical };
		}
		return { ok: false, error: { code: 'workspace-unknown', message: 'path is not inside a registered workspace' } };
	};
}

/** List one directory: name + dir flag, VCS/dependency dirs skipped. */
async function listDir(canonical) {
	const dirents = await readdir(canonical, { withFileTypes: true });
	const entries = [];
	for (const entry of dirents) {
		if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) continue;
		entries.push({ name: entry.name, dir: entry.isDirectory() });
	}
	entries.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
	return entries;
}

/**
 * Current branch name. `rev-parse --abbrev-ref HEAD` fails in a freshly
 * initialized repository (no commits yet), so fall back to the symbolic ref
 * — `git init` always points HEAD at the default branch even before the
 * first commit.
 */
async function headBranch(runner, canonical) {
	const r = await runner.run(['rev-parse', '--abbrev-ref', 'HEAD'], canonical);
	if (r.exitCode === 0) return { ok: true, branch: r.stdout.trim() };
	const s = await runner.run(['symbolic-ref', '--short', 'HEAD'], canonical);
	if (s.exitCode === 0) return { ok: true, branch: s.stdout.trim() };
	return { ok: false };
}

/** Workspace git snapshot: repository root, branch, and changed files (null root = not a repository). */
async function gitStatus(runner, canonical) {
	const head = await headBranch(runner, canonical);
	if (!head.ok) return { root: null, branch: null, files: [] };
	const status = await runner.run(['status', '--porcelain', '-z'], canonical);
	const files = status.exitCode === 0 ? parseStatusZ(status.stdout) : [];
	return { root: canonical, branch: head.branch, files };
}

/** Local branch list with the current branch marked (null root = not a repository). */
async function gitBranches(runner, canonical) {
	const head = await headBranch(runner, canonical);
	if (!head.ok) return { root: null, branch: null, branches: [] };
	const out = await runner.run(['for-each-ref', 'refs/heads', '--format=%(refname:short)%00%(HEAD)%00%(objectname)'], canonical);
	const branches = [];
	for (const line of out.stdout.split('\n')) {
		if (line === '') continue;
		const [name, mark] = line.split('\0');
		if (name !== void 0) branches.push({ name, current: mark === '*' });
	}
	branches.sort((a, b) => a.name.localeCompare(b.name));
	return { root: canonical, branch: head.branch, branches };
}

/**
 * Workspace-level branch switch: `git switch --no-guess -- <branch>` with a
 * name sanity gate and branch-existence probe. Mirrors the git-graph plugin's
 * guards in a lighter form.
 */
async function gitSwitch(runner, canonical, branch) {
	if (typeof branch !== 'string' || branch === '' || branch.startsWith('-') || branch.includes('..') || branch.includes(' ')) {
		return { ok: false, error: { code: 'invalid-branch', message: 'invalid branch name' } };
	}
	const verify = await runner.run(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], canonical);
	if (verify.exitCode !== 0) {
		return { ok: false, error: { code: 'branch-not-found', message: `branch '${branch}' not found` } };
	}
	const out = await runner.run(['switch', '--no-guess', '--', branch], canonical);
	if (out.exitCode !== 0) {
		const message = out.stderr.trim().split('\n')[0] ?? 'git switch failed';
		const code = /local changes|would be overwritten|conflict/i.test(out.stderr) ? 'worktree-dirty' : 'switch-failed';
		return { ok: false, error: { code, message } };
	}
	return { ok: true, branch };
}

/** Recent commit history: hash, author, timestamp, subject (null root = not a repository). */
async function gitLog(runner, canonical, limit) {
	const head = await headBranch(runner, canonical);
	if (!head.ok) return { root: null, branch: null, commits: [] };
	const n = typeof limit === 'number' && Number.isInteger(limit) && limit > 0 && limit <= 100 ? String(limit) : '20';
	const out = await runner.run(['log', '-n', n, '--format=%H%x00%an%x00%at%x00%s%x1e'], canonical);
	const commits = [];
	for (let rec of out.stdout.split('\x1e')) {
		if (rec === '') continue;
		if (rec.startsWith('\n')) rec = rec.slice(1);
		const [hash, author, at, subject] = rec.split('\x00');
		if (hash === void 0 || hash === '') continue;
		commits.push({
			hash,
			short: hash.slice(0, 7),
			author: author ?? '',
			date: Number(at) || 0,
			subject: subject ?? ''
		});
	}
	return { root: canonical, branch: head.branch, commits };
}

/**
 * Ensure the requested path resolves to a git repository. The probe follows
 * git's native upward search (so outer and nested repositories are found
 * untouched); only when NO repository exists anywhere up the tree AND the
 * path is a registered workspace root do we initialize one there — the
 * user-requested auto-init. `git init` never touches working files.
 * @returns true when a repository is available (or was just created).
 */
async function ensureRepo(runner, canonical, workspaceRoots) {
	const probe = await runner.run(['rev-parse', '--is-inside-work-tree'], canonical);
	if (probe.exitCode === 0) return true;
	if (workspaceRoots.includes(canonical)) {
		await runner.run(['init'], canonical);
		return true;
	}
	return false;
}

/**
 * Register the /dsh-layout routes.
 * @param ctx - context carrying webServer, subprocess, and workspaceRegistry.
 * @returns the route disposers.
 */
function registerRoutes(ctx) {
	const runner = subprocessRunner(ctx);
	const gate = createWorkspaceGate(ctx);
	const workspaceRoots = ctx.workspaceRegistry.list().map((workspace) => workspace.path);
	const handler = async (req, res) => {
		if (req.method !== 'POST') {
			res.writeHead(405);
			res.end();
			return;
		}
		if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
			res.writeHead(415);
			res.end();
			return;
		}
		const pathname = new URL(req.url ?? '/', 'http://x').pathname;
		const payload = await readJsonBody(req);
		const path = pathOf(payload);
		if (path === null) {
			json(res, FAIL(BAD_REQUEST));
			return;
		}
		const allowed = await gate(path);
		if (!allowed.ok) {
			json(res, FAIL(allowed.error));
			return;
		}
		try {
			// Git routes: make sure a repository exists (auto-init at a
			// workspace root only when none is found anywhere up the tree).
			if (pathname.startsWith('/dsh-layout/git-')) {
				await ensureRepo(runner, allowed.canonical, workspaceRoots);
			}
			switch (pathname) {
				case '/dsh-layout/fs-list':
					json(res, OK({ entries: await listDir(allowed.canonical) }));
					return;
				case '/dsh-layout/git-status':
					json(res, OK(await gitStatus(runner, allowed.canonical)));
					return;
				case '/dsh-layout/git-branches':
					json(res, OK(await gitBranches(runner, allowed.canonical)));
					return;
				case '/dsh-layout/git-switch': {
					const branch = typeof payload === 'object' && payload !== null ? payload.branch : void 0;
					if (typeof branch !== 'string' || branch === '') {
						json(res, FAIL(BAD_REQUEST));
						return;
					}
					const result = await gitSwitch(runner, allowed.canonical, branch);
					json(res, result.ok ? OK({ branch: result.branch }) : FAIL(result.error));
					return;
				}
				case '/dsh-layout/git-log': {
					const rawLimit = typeof payload === 'object' && payload !== null ? payload.limit : void 0;
					json(res, OK(await gitLog(runner, allowed.canonical, rawLimit)));
					return;
				}
				default:
					res.writeHead(404);
					res.end();
			}
		} catch (error) {
			ctx.logger.warn(`dsh-layout-tools: ${pathname} failed for ${path}: ${String(error)}`);
			json(res, FAIL({ code: 'internal', message: String(error) }), 500);
		}
	};
	const disposer = ctx.webServer.register({ kind: 'prefix', path: '/dsh-layout', handler });
	return () => disposer();
}

/** Required services: the route registry, the managed subprocess seam, and the workspace registry. */
const inject = ['webServer', 'subprocess', 'workspaceRegistry'];

/** Mount the fs + git-status routes. */
function apply(ctx) {
	ctx.effect(() => registerRoutes(ctx), 'dsh-layout-tools: /dsh-layout routes');
}

export { apply, inject };
