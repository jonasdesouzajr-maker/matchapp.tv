'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {requestReleaseSmoke, titleFor, completeList, DISPATCH_STEP} = require('../tools/release-smoke-dispatch.cjs');
const SHA = 'a'.repeat(40), NEWER = 'b'.repeat(40);
const root = path.join(__dirname, '..');
const pagesYaml = fs.readFileSync(path.join(root, '.github/workflows/pages-deploy.yml'), 'utf8');
const smokeYaml = fs.readFileSync(path.join(root, '.github/workflows/release-smoke.yml'), 'utf8');
const pageRun = (extra = {}) => ({id: 101, path: '.github/workflows/pages-deploy.yml',
  head_sha: SHA, head_branch: 'main', run_attempt: 1, status: 'in_progress',
  created_at: '2026-10-20T21:00:00Z', ...extra});
const smokeRun = (extra = {}) => ({id: 202, path: '.github/workflows/release-smoke.yml',
  display_title: titleFor(SHA), head_sha: SHA, head_branch: 'main',
  event: 'workflow_dispatch', status: 'queued', conclusion: null,
  html_url: 'https://github.com/example/site/actions/runs/202', ...extra});

function fixture(options = {}) {
  const current = pageRun({run_attempt: options.attempt || 1, ...options.current});
  const calls = [], saved = [];
  let sent = false, smokeReads = 0;
  const api = {
    async getWorkflowRun(parameters) { calls.push(['get', parameters]); return {data: current}; },
    async listWorkflowRuns(parameters) {
      calls.push(['list', parameters]);
      let runs;
      if (parameters.workflow_id === 'pages-deploy.yml') runs = options.pages || [current];
      else {
        smokeReads++;
        runs = options.smokes ? options.smokes({sent, smokeReads}) : sent ? [smokeRun()] : [];
      }
      return {data: {total_count: runs.length, workflow_runs: runs}};
    },
    async listJobsForWorkflowRunAttempt(parameters) {
      calls.push(['jobs', parameters]);
      const jobs = options.jobs ? options.jobs(parameters) : [];
      return {data: {total_count: jobs.length, jobs}};
    },
    async createWorkflowDispatch(parameters) {
      calls.push(['dispatch', parameters]); sent = true;
      if (options.dispatchError) throw new Error(options.dispatchError);
      return options.response || {status: 204};
    }
  };
  const run = () => requestReleaseSmoke({github: {rest: {actions: api}},
    context: {repo: {owner: 'example', repo: 'site'}, runId: current.id},
    expectedSha: options.sha || SHA, runAttempt: current.run_attempt,
    save: evidence => saved.push(structuredClone(evidence)), sleep: async () => {}, polls: 3});
  return {run, calls, saved, api, posts: () => calls.filter(call => call[0] === 'dispatch')};
}

test('successful Pages requests exactly one explicit smoke with immutable SHA and deployment attempt', async () => {
  const f = fixture();
  const result = await f.run();
  assert.equal(result.status, 'run-confirmed');
  assert.equal(result.smokeRunId, 202);
  assert.equal(f.posts().length, 1);
  assert.deepEqual(f.posts()[0][1], {owner: 'example', repo: 'site', workflow_id: 'release-smoke.yml',
    ref: 'main', inputs: {expected_sha: SHA, pages_run_id: '101', pages_run_attempt: '1'}});
  assert.equal(f.calls.some(call => call[0] === 'jobs'), false, 'current executing attempt is excluded');
  assert.ok(f.saved.some(item => item.status === 'submitting'));
});

test('both historical 204 and current 200 responses reconcile the actual run', async () => {
  for (const response of [{status: 204}, {status: 200, data: {workflow_run_id: 202}}]) {
    const f = fixture({response});
    assert.equal((await f.run()).smokeRunId, 202);
    assert.equal(f.posts().length, 1);
  }
});

test('dedupe uses requested identity even when main advances before dispatch', async () => {
  const f = fixture({smokes: () => [smokeRun({head_sha: NEWER})]});
  assert.equal((await f.run()).status, 'run-confirmed');
  assert.equal(f.posts().length, 0);
  const queries = f.calls.filter(call => call[0] === 'list' && call[1].workflow_id === 'release-smoke.yml');
  assert.ok(queries.every(call => !('head_sha' in call[1])));
});

test('all active statuses and a successful run prevent another submission', async () => {
  for (const status of ['queued', 'in_progress', 'requested', 'waiting', 'pending', 'completed']) {
    const f = fixture({smokes: () => [smokeRun({status, conclusion: status === 'completed' ? 'success' : null})]});
    assert.equal((await f.run()).status, status === 'completed' ? 'already-succeeded' : 'run-confirmed');
    assert.equal(f.posts().length, 0);
  }
});

test('failed, cancelled, skipped and duplicate prior smoke runs stay visible without redispatch', async () => {
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    const f = fixture({smokes: () => [smokeRun({status: 'completed', conclusion})]});
    await assert.rejects(f.run(), /inspect or recover that run/);
    assert.equal(f.posts().length, 0);
  }
  const duplicate = fixture({smokes: () => [smokeRun(), smokeRun({id: 203})]});
  await assert.rejects(duplicate.run(), /Multiple smoke runs/);
  assert.equal(duplicate.posts().length, 0);
});

test('exact run title, branch, event and workflow must all match', async () => {
  for (const wrong of [{display_title: titleFor(NEWER)}, {head_branch: 'feature'},
    {event: 'workflow_run'}, {path: '.github/workflows/unrelated.yml'}]) {
    const f = fixture({smokes: ({sent}) => sent ? [smokeRun()] : [smokeRun(wrong)]});
    assert.equal((await f.run()).smokeRunId, 202);
    assert.equal(f.posts().length, 1);
  }
});

test('invalid SHA or a caller outside the exact active main Pages attempt cannot submit', async () => {
  for (const options of [{sha: 'main'}, {sha: SHA.toUpperCase()}, {sha: SHA + ';echo unsafe'},
    {current: {head_sha: NEWER}}, {current: {head_branch: 'feature'}},
    {current: {path: '.github/workflows/another.yml'}}, {current: {status: 'completed'}}]) {
    const f = fixture(options);
    await assert.rejects(f.run());
    assert.equal(f.posts().length, 0);
  }
});

test('a lost POST response is reconciled without sending it twice', async () => {
  const f = fixture({dispatchError: 'connection closed after request was sent'});
  assert.equal((await f.run()).smokeRunId, 202);
  assert.equal(f.posts().length, 1);
  assert.ok(f.saved.some(item => item.status === 'dispatch-response-unknown'));
});

test('unconfirmed and failed-read outcomes never repeat POST and persist unknown evidence', async () => {
  for (const dispatchError of [undefined, 'connection lost']) {
    const f = fixture({dispatchError, smokes: () => []});
    await assert.rejects(f.run(), /delivery was not confirmed/);
    assert.equal(f.posts().length, 1);
    assert.equal(f.saved.at(-1).status, 'dispatch-outcome-unknown');
  }
  const f = fixture({smokes: ({sent}) => { if (sent) throw new Error('read unavailable'); return []; }});
  await assert.rejects(f.run(), /read unavailable/);
  assert.equal(f.posts().length, 1);
  assert.equal(f.saved.at(-1).status, 'dispatch-outcome-unknown');
});

const attemptedJob = (extra = {}) => ({id: 301, steps: [{name: DISPATCH_STEP,
  status: 'completed', conclusion: 'failure', started_at: '2026-10-20T21:05:00Z', ...extra}]});

test('a prior attempt that started dispatch is a durable unknown reservation across reruns', async () => {
  for (const step of [{}, {status: 'completed', conclusion: 'cancelled'},
    {status: 'in_progress', conclusion: null}]) {
    const f = fixture({attempt: 2, jobs: () => [attemptedJob(step)]});
    await assert.rejects(f.run(), /never blindly repeated/);
    assert.equal(f.posts().length, 0);
    assert.equal(f.saved.at(-1).status, 'prior-request-unresolved');
    assert.deepEqual(f.calls.filter(call => call[0] === 'jobs').map(call => call[1].attempt_number), [1]);
  }
});

test('an earlier Pages run with the same SHA also reserves its unknown request', async () => {
  const f = fixture({pages: [pageRun(), pageRun({id: 100, status: 'completed'})],
    jobs: () => [attemptedJob()]});
  await assert.rejects(f.run(), /Pages 100\/1 already started/);
  assert.equal(f.posts().length, 0);
});

test('an unsettled older Pages run blocks while a skipped request allows safe first delivery', async () => {
  const unsettled = fixture({pages: [pageRun(), pageRun({id: 100})]});
  await assert.rejects(unsettled.run(), /Earlier Pages run 100 is unsettled/);
  assert.equal(unsettled.posts().length, 0);
  const skipped = fixture({attempt: 2, jobs: () => [attemptedJob({conclusion: 'skipped'})]});
  assert.equal((await skipped.run()).smokeRunId, 202);
  assert.equal(skipped.posts().length, 1);
});

test('missing prior step history fails closed instead of assuming no request was sent', async () => {
  for (const steps of [null, []]) {
    const f = fixture({attempt: 2, jobs: () => [{id: 301, conclusion: 'cancelled', steps}]});
    await assert.rejects(f.run(), /Missing step history/);
    assert.equal(f.posts().length, 0);
  }
});

test('pagination reads complete history and refuses truncated, overlapping or malformed data', async () => {
  const hundred = Array.from({length: 100}, (_, i) => ({id: i + 1}));
  const pages = [];
  const all = await completeList(async ({page}) => { pages.push(page); return {data: {
    total_count: 101, workflow_runs: page === 1 ? hundred : [{id: 101}]}}; }, {}, 'workflow_runs');
  assert.equal(all.length, 101);
  assert.deepEqual(pages, [1, 2]);
  for (const data of [{total_count: 1001, workflow_runs: []},
    {total_count: 2, workflow_runs: [{id: 1}]}, {total_count: 2, workflow_runs: [{id: 1}, {id: 1}]},
    {total_count: 1, workflow_runs: [{}]}, {total_count: '0', workflow_runs: []}]) {
    await assert.rejects(completeList(async () => ({data}), {}, 'workflow_runs'));
  }
});

const validationScript = smokeYaml.match(/      - name: Verify deployment identity before checkout[\s\S]*?          script: \|\n([\s\S]*?)      - uses: actions\/checkout@/)[1]
  .split('\n').map(line => line.replace(/^            /, '')).join('\n');
async function validateDeployment({env = {}, run = {}, step = {}, jobs = null} = {}) {
  const calls = [];
  const script = new vm.Script(`(async () => {${validationScript}\n})()`);
  const sandbox = {process: {env: {EXPECTED_SHA: SHA, PAGES_RUN_ID: '101', PAGES_RUN_ATTEMPT: '1', ...env}},
    context: {repo: {owner: 'example', repo: 'site'}},
    github: {rest: {actions: {
      getWorkflowRun: async parameters => { calls.push(parameters); return {data: pageRun(run)}; },
      listJobsForWorkflowRunAttempt: () => {}
    }}, paginate: async (_method, parameters) => { calls.push(parameters); return jobs || [{name: 'deploy',
      steps: [{name: 'Deploy validated Pages artifact', conclusion: 'success', ...step}]}]; }} };
  await script.runInNewContext(sandbox);
  return calls;
}

test('pre-checkout provenance accepts a successful deploy while the parent is still running', async () => {
  const calls = await validateDeployment();
  assert.equal(calls[1].attempt_number, 1);
  await validateDeployment({run: {run_attempt: 2}});
});

test('pre-checkout provenance rejects unsafe inputs, wrong deployment and failed or missing deploy step', async () => {
  for (const value of [{env: {EXPECTED_SHA: 'main'}}, {env: {PAGES_RUN_ID: '1; echo unsafe'}},
    {env: {PAGES_RUN_ATTEMPT: '0'}}, {env: {PAGES_RUN_ID: '9007199254740992'}},
    {run: {head_sha: NEWER}}, {run: {head_branch: 'feature'}},
    {run: {path: '.github/workflows/not-pages.yml'}}, {env: {PAGES_RUN_ATTEMPT: '2'}},
    {step: {conclusion: 'failure'}}, {step: {conclusion: 'skipped'}}, {jobs: []}]) {
    await assert.rejects(validateDeployment(value));
  }
});

test('workflow wiring preserves single ownership, independent IndexNow, exact SHA, retained proof and emulator exclusion', () => {
  assert.doesNotMatch(smokeYaml, /workflow_run:/);
  assert.match(smokeYaml, /run-name: 'Release smoke: \$\{\{ inputs\.expected_sha \}\}'/);
  assert.match(smokeYaml, /ref: \$\{\{ inputs\.expected_sha \}\}/);
  assert.ok(smokeYaml.indexOf('Verify deployment identity before checkout') < smokeYaml.indexOf('uses: actions/checkout@'));
  assert.match(pagesYaml, /group: pages\n  cancel-in-progress: true/);
  assert.match(pagesYaml, /Request one live smoke for the deployed SHA\n        if: \$\{\{ !cancelled\(\) && steps\.deploy\.outcome == 'success' \}\}/);
  assert.ok(pagesYaml.indexOf('gh workflow run indexnow.yml --ref main') < pagesYaml.indexOf(DISPATCH_STEP));
  assert.match(pagesYaml, /retries: 0/);
  assert.match(smokeYaml, /android-emulator:[\s\S]*?if: \$\{\{ false \}\}/);
  assert.match(smokeYaml, /tested-sha\.txt/);
  assert.match(smokeYaml, /after-sha\.txt/);
  assert.match(smokeYaml, /release=\$\{EXPECTED_SHA\}-\$\{i\}-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}/);
  assert.match(smokeYaml, /release=\$\{EXPECTED_SHA\}-after-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}/);
  assert.match(smokeYaml, /Production advanced during browser validation/);
  assert.match(smokeYaml, /if: always\(\)[\s\S]*?MatchApp-live-browser-screenshots/);
});
