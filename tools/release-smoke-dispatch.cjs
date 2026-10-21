'use strict';

// Pages is the sole automatic caller. Its existing concurrency lock serializes
// publishers; prior run/attempt step history is the durable reservation if a
// runner is cancelled or loses the dispatch response. Never retry that POST.
const WORKFLOW = 'release-smoke.yml';
const PAGES = 'pages-deploy.yml';
const DISPATCH_STEP = 'Request one live smoke for the deployed SHA';
const ACTIVE = new Set(['queued', 'in_progress', 'requested', 'waiting', 'pending']);
const titleFor = sha => `Release smoke: ${sha}`;

async function completeList(method, parameters, field) {
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const {data} = await method({...parameters, per_page: 100, page});
    if (!data || !Array.isArray(data[field]) || !Number.isInteger(data.total_count)
        || data.total_count < 0 || data.total_count > 1000) {
      throw new Error(`Cannot establish complete ${field} history; stop before another dispatch.`);
    }
    if (data[field].some(item => !Number.isSafeInteger(item.id) || item.id < 1)) {
      throw new Error(`Invalid ${field} identity; stop before another dispatch.`);
    }
    items.push(...data[field]);
    if (new Set(items.map(item => item.id)).size !== items.length) {
      throw new Error(`Overlapping ${field} history; reconcile before another dispatch.`);
    }
    if (items.length === data.total_count) return items;
    if (items.length > data.total_count || data[field].length < 100) {
      throw new Error(`Incomplete ${field} history; stop before another dispatch.`);
    }
  }
  throw new Error(`Truncated ${field} history; stop before another dispatch.`);
}

async function requestReleaseSmoke({github, context, expectedSha, runAttempt, save,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), polls = 24}) {
  if (!/^[a-f0-9]{40}$/.test(expectedSha || '') || !Number.isSafeInteger(context.runId)
      || context.runId < 1 || !Number.isSafeInteger(runAttempt) || runAttempt < 1) {
    throw new Error('A full lowercase deployment SHA and valid Pages run/attempt are required.');
  }
  const {owner, repo} = context.repo;
  const api = github.rest.actions;
  const evidence = {expectedSha, pagesRunId: context.runId, pagesRunAttempt: runAttempt,
    workflow: WORKFLOW, status: 'checking', startedAt: new Date().toISOString()};
  const record = status => { evidence.status = status; save(evidence); };
  record('checking');
  try {
    const {data: current} = await api.getWorkflowRun({owner, repo, run_id: context.runId});
    if (current.head_sha !== expectedSha || current.head_branch !== 'main'
        || current.path !== `.github/workflows/${PAGES}` || current.run_attempt !== runAttempt
        || current.status !== 'in_progress') {
      throw new Error('The caller is not the active Pages attempt for this main deployment.');
    }
    const pages = await completeList(api.listWorkflowRuns, {owner, repo,
      workflow_id: PAGES, head_sha: expectedSha, branch: 'main'}, 'workflow_runs');
    if (!pages.some(run => run.id === current.id)) pages.push(current);
    if (pages.some(run => run.head_sha !== expectedSha || run.head_branch !== 'main'
        || run.path !== current.path || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1
        || run.run_attempt > 20 || !Number.isFinite(Date.parse(run.created_at)))) {
      throw new Error('Pages history cannot establish a bounded, exact deployment identity.');
    }
    const since = pages.map(run => run.created_at).sort()[0];
    async function reconcile() {
      // The dispatched workflow's head_sha can be a newer main commit. The
      // explicit input is retained in run-name, so do not filter by head_sha.
      const runs = await completeList(api.listWorkflowRuns, {owner, repo,
        workflow_id: WORKFLOW, event: 'workflow_dispatch', branch: 'main',
        created: `>=${since}`}, 'workflow_runs');
      const matches = runs.filter(run => run.display_title === titleFor(expectedSha)
        && run.event === 'workflow_dispatch' && run.head_branch === 'main'
        && run.path === `.github/workflows/${WORKFLOW}`);
      if (matches.length > 1) {
        evidence.matchingRunIds = matches.map(run => run.id);
        throw new Error('Multiple smoke runs already claim this SHA; stop and reconcile them.');
      }
      if (!matches.length) return false;
      const run = matches[0];
      evidence.smokeRunId = run.id;
      evidence.smokeUrl = run.html_url;
      evidence.smokeStatus = run.status;
      evidence.smokeConclusion = run.conclusion;
      if (run.status === 'completed' && run.conclusion === 'success') {
        record('already-succeeded');
        return true;
      }
      if (ACTIVE.has(run.status)) {
        record('run-confirmed');
        return true;
      }
      throw new Error(`Existing smoke ${run.id} is ${run.conclusion || run.status}; inspect or recover that run instead of dispatching another.`);
    }
    if (await reconcile()) return evidence;

    for (const run of pages) {
      if (run.id !== current.id && run.status !== 'completed') {
        throw new Error(`Earlier Pages run ${run.id} is unsettled; reconcile it before another dispatch.`);
      }
      for (let attempt = 1; attempt <= run.run_attempt; attempt++) {
        if (run.id === current.id && attempt === runAttempt) continue;
        const jobs = await completeList(api.listJobsForWorkflowRunAttempt, {owner, repo,
          run_id: run.id, attempt_number: attempt}, 'jobs');
        for (const job of jobs) {
          if (!Array.isArray(job.steps) || !job.steps.length) {
            if (job.conclusion === 'skipped') continue;
            throw new Error(`Missing step history for Pages ${run.id}/${attempt}; reconcile before dispatch.`);
          }
          const started = job.steps.some(step => step.name === DISPATCH_STEP
            && step.conclusion !== 'skipped' && (step.started_at || step.status !== 'queued'));
          if (started) {
            evidence.priorRequest = {pagesRunId: run.id, attempt};
            record('prior-request-unresolved');
            throw new Error(`Pages ${run.id}/${attempt} already started a smoke request; its outcome must be reconciled, never blindly repeated.`);
          }
        }
      }
    }
    // History checks may take time. Reconcile once more before the single POST.
    if (await reconcile()) return evidence;
    evidence.requestedAt = new Date().toISOString();
    record('submitting');
    try {
      await api.createWorkflowDispatch({owner, repo, workflow_id: WORKFLOW, ref: 'main',
        inputs: {expected_sha: expectedSha, pages_run_id: String(context.runId),
          pages_run_attempt: String(runAttempt)}});
      record('requested');
    } catch (error) {
      evidence.dispatchError = String(error.message || error).slice(0,500);
      record('dispatch-response-unknown');
    }
    // Both the historical 204 and newer 200 dispatch responses are accepted.
    // Only a matching run proves delivery; no response or poll can repeat POST.
    for (let poll = 0; poll < polls; poll++) {
      if (await reconcile()) return evidence;
      if (poll + 1 < polls) await sleep(5000);
    }
    record('dispatch-outcome-unknown');
    throw new Error('Smoke delivery was not confirmed; reconcile this Pages request before any recovery.');
  } catch (error) {
    evidence.error = String(error.message || error).slice(0,1000);
    if (!['prior-request-unresolved', 'dispatch-outcome-unknown'].includes(evidence.status)) {
      evidence.status = evidence.requestedAt ? 'dispatch-outcome-unknown' : 'blocked-before-dispatch';
    }
    save(evidence);
    throw error;
  }
}

module.exports = {requestReleaseSmoke, titleFor, completeList, DISPATCH_STEP};
