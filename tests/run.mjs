#!/usr/bin/env node
// Runs the browser tests in tests/browser and prints one pass/fail list.
//
//   node tests/run.mjs                 every test, desktop and phone where a test has both
//   node tests/run.mjs modes stage     only the tests whose file name starts with one of these words
//
// A test is any .mjs in tests/browser whose name does not start with "_". It prints one line per check
// ("ok ..." or "FAIL ...") and exits 1 when a check failed. A test that takes a "phone" argument says so with
// a line containing "[phone]" in its Usage comment, and is then run twice.
// The sandbox SillyTavern has to be running already (see tests/browser/_harness.mjs).
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'tests/browser');
const TIMEOUT_MINUTES = 5;
const only = process.argv.slice(2);

function run(file, args) {
    return new Promise((done) => {
        const started = Date.now();
        const child = spawn(process.execPath, [join(DIR, file), ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        let timedOut = false;
        child.stdout.on('data', (d) => { output += d; });
        child.stderr.on('data', (d) => { output += d; });
        const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT_MINUTES * 60 * 1000);
        child.on('close', (code) => { clearTimeout(timer); done({ code: code ?? 1, output, timedOut, seconds: Math.round((Date.now() - started) / 1000) }); });
    });
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort()
    .filter((f) => !only.length || only.some((word) => f.startsWith(word)));
if (!files.length) { console.log(`No test matches: ${only.join(', ')}`); process.exit(2); }

let passed = 0;
const failed = [];
for (const file of files) {
    const variants = /Usage:.*\[phone\]/.test(readFileSync(join(DIR, file), 'utf8')) ? [[], ['phone']] : [[]];
    for (const args of variants) {
        const label = [file.slice(0, -4), ...args].join(' ');
        const r = await run(file, args);
        const lines = r.output.split('\n');
        const oks = lines.filter((l) => /^ok\b/.test(l)).length;
        const fails = lines.filter((l) => /^FAIL\b/.test(l));
        if (!r.timedOut && r.code === 0 && !fails.length && oks) { passed++; console.log(`ok       ${label}  ${oks} checks, ${r.seconds}s`); continue; }
        failed.push(label);
        const why = r.timedOut ? `no result after ${TIMEOUT_MINUTES} minutes` : fails.length ? `${fails.length} of ${fails.length + oks} checks failed` : oks ? `exit ${r.code}` : `stopped with an error or printed no checks (exit ${r.code})`;
        console.log(`FAIL     ${label}  ${why}, ${r.seconds}s`);
        for (const line of (fails.length ? fails.slice(0, 10) : r.output.trim().split('\n').slice(-8))) console.log(`           ${line.slice(0, 300)}`);
    }
}
console.log(`\n${passed} passed, ${failed.length} failed${failed.length ? `: ${failed.join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
