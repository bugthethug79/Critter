'use strict';

/*
 * Critter Forums launcher for bot-hosting.net (Node.js runtime).
 *
 * On each start:
 *   1. Fetches NodeBB (NODEBB_REF) into ./nodebb if it isn't there yet,
 *      or moves to a new version when NODEBB_REF changes.
 *   2. Installs NodeBB's dependencies.
 *   3. First start only: runs NodeBB's setup from environment variables,
 *      which creates the database, the admin account and the front-end build.
 *   4. Starts the forum on the port the panel gives the app.
 *
 * No dependencies of its own. Configuration is all environment variables;
 * see README.md in this folder.
 */

const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const NODEBB_REF = process.env.NODEBB_REF || 'v4.16.4';
const NODEBB_REPO = 'https://github.com/NodeBB/NodeBB.git';

const dir = path.join(__dirname, 'nodebb');
const refFile = path.join(dir, '.critter-ref');
const configFile = path.join(dir, 'config.json');

const log = (msg) => console.log(`[critter-forum] ${msg}`);

function fail(msg) {
	console.error(`[critter-forum] ${msg}`);
	process.exit(1);
}

function run(cmd, args, opts = {}) {
	log(`$ ${cmd} ${args.join(' ')}`);
	const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
	if (res.error) fail(`${cmd} could not start: ${res.error.message}`);
	if (res.status !== 0) fail(`${cmd} exited with code ${res.status}`);
}

function required(name) {
	const value = process.env[name];
	if (!value) fail(`Missing environment variable ${name}. See forum/README.md.`);
	return value;
}

const port = process.env.SERVER_PORT || process.env.PORT || process.env.NODEBB_PORT || '4567';
const url = required('FORUM_URL').replace(/\/+$/, '');

/* 1. Code ----------------------------------------------------------------- */

function fetchCode(target) {
	run('git', ['clone', '--depth', '1', '--branch', NODEBB_REF, NODEBB_REPO, target]);
}

const installedRef = fs.existsSync(refFile) ? fs.readFileSync(refFile, 'utf8').trim() : null;
let upgraded = false;

if (!fs.existsSync(path.join(dir, 'app.js'))) {
	log(`Fetching NodeBB ${NODEBB_REF}`);
	fs.rmSync(dir, { recursive: true, force: true });
	fetchCode(dir);
} else if (installedRef !== NODEBB_REF) {
	// Swap in the new version, keeping the config and anything people uploaded
	log(`Upgrading NodeBB ${installedRef || '(unknown)'} → ${NODEBB_REF}`);
	const next = `${dir}-next`;
	fs.rmSync(next, { recursive: true, force: true });
	fetchCode(next);
	if (fs.existsSync(configFile)) fs.copyFileSync(configFile, path.join(next, 'config.json'));
	const uploads = path.join(dir, 'public', 'uploads');
	if (fs.existsSync(uploads)) {
		fs.rmSync(path.join(next, 'public', 'uploads'), { recursive: true, force: true });
		fs.cpSync(uploads, path.join(next, 'public', 'uploads'), { recursive: true });
	}
	fs.rmSync(dir, { recursive: true, force: true });
	fs.renameSync(next, dir);
	upgraded = fs.existsSync(configFile);
}

/* 2. Dependencies --------------------------------------------------------- */

// NodeBB ships its package.json under install/ and expects it copied to the root
const pkg = path.join(dir, 'package.json');
if (!fs.existsSync(pkg) || installedRef !== NODEBB_REF) {
	fs.copyFileSync(path.join(dir, 'install', 'package.json'), pkg);
	run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], { cwd: dir });
	fs.writeFileSync(refFile, `${NODEBB_REF}\n`);
}

/* 3. First-time setup ----------------------------------------------------- */

// Settings NodeBB reads from the environment at runtime (nconf, "__" = nesting)
const runtimeEnv = {
	...process.env,
	url,
	port,
	NODE_ENV: 'production',
	// The container allows only a few processes; see limit-cpus.js
	NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${path.join(__dirname, 'limit-cpus.js')}`.trim(),
	GOMAXPROCS: process.env.GOMAXPROCS || '1', // esbuild, used by the minifier
	series: 'true', // build one target at a time
};
// Lets the database password be changed later by updating MONGO_URI alone
if (process.env.MONGO_URI) runtimeEnv.mongo__uri = process.env.MONGO_URI;

if (!fs.existsSync(configFile)) {
	log('No config.json yet: running first-time setup');
	const setup = {
		url,
		port,
		database: 'mongo',
		'admin:username': required('ADMIN_USERNAME'),
		'admin:email': required('ADMIN_EMAIL'),
		'admin:password': required('ADMIN_PASSWORD'),
	};
	setup['admin:password:confirm'] = setup['admin:password'];

	if (process.env.MONGO_URI) {
		setup['mongo:uri'] = process.env.MONGO_URI;
	} else {
		setup['mongo:host'] = required('MONGO_HOST');
		setup['mongo:port'] = process.env.MONGO_PORT || '27017';
		setup['mongo:username'] = process.env.MONGO_USERNAME || '';
		setup['mongo:password'] = process.env.MONGO_PASSWORD || '';
		setup['mongo:database'] = process.env.MONGO_DATABASE || 'nodebb';
	}

	// Passed in the environment, not as an argument: arguments end up in logs and error reports
	run('node', ['app.js'], { cwd: dir, env: { ...runtimeEnv, setup: JSON.stringify(setup) } });
	if (!fs.existsSync(configFile)) fail('Setup finished without writing config.json. Check the log above.');
	log('Setup complete. You can now remove ADMIN_PASSWORD from the environment variables.');
} else if (upgraded) {
	run('node', ['nodebb', 'upgrade'], { cwd: dir, env: runtimeEnv });
}

// The panel's HTTPS proxy sits in front of the app. This has to be a real boolean,
// so it goes in config.json: values from the environment arrive as strings.
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
if (config.trust_proxy !== true) {
	config.trust_proxy = true;
	fs.writeFileSync(configFile, `${JSON.stringify(config, null, 4)}\n`);
}

// The front-end build writes this last, so it's missing if a build was interrupted
if (!fs.existsSync(path.join(dir, 'build', 'cache-buster'))) {
	log('Front end not built yet: building it now');
	run('node', ['nodebb', 'build'], { cwd: dir, env: runtimeEnv });
}

/* 4. Run ------------------------------------------------------------------ */

log(`Starting NodeBB on port ${port} for ${url}`);
const child = spawn('node', ['loader.js', '--no-daemon', '--no-silent'], {
	cwd: dir,
	env: runtimeEnv,
	stdio: 'inherit',
});
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => child.kill(sig)));
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0));
