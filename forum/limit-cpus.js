'use strict';

/*
 * Preloaded into every NodeBB process (NODE_OPTIONS=--require).
 *
 * The container reports the host's CPU count (20+) but only allows a handful
 * of processes, so NodeBB's build starts one worker per core and crashes with
 * EAGAIN. Reporting fewer CPUs makes the build and minifier size their worker
 * pools to fit.
 */

const os = require('os');

const limit = Math.max(1, parseInt(process.env.FORUM_CPUS, 10) || 1);
const cpus = os.cpus.bind(os);

os.cpus = () => cpus().slice(0, limit);
os.availableParallelism = () => limit;
