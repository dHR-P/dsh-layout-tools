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

/** Workspace git snapshot: repository root, branch, and changed files (null root = not a repository). */
async function gitStatus(runner, canonical) {
	const head = await runner.run(['rev-parse', '--abbrev-ref', 'HEAD'], canonical);
	if (head.exitCode !== 0) return { root: null, branch: null, files: [] };
	const branch = head.stdout.trim();
	const status = await runner.run(['status', '--porcelain', '-z'], canonical);
	const files = status.exitCode === 0 ? parseStatusZ(status.stdout) : [];
	return { root: canonical, branch, files };
}

/**
 * Register the /dsh-layout routes.
 * @param ctx - context carrying webServer, subprocess, and workspaceRegistry.
 * @returns the route disposers.
 */
function registerRoutes(ctx) {
	const runner = subprocessRunner(ctx);
	const gate = createWorkspaceGate(ctx);
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
			switch (pathname) {
				case '/dsh-layout/fs-list':
					json(res, OK({ entries: await listDir(allowed.canonical) }));
					return;
				case '/dsh-layout/git-status':
					json(res, OK(await gitStatus(runner, allowed.canonical)));
					return;
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
