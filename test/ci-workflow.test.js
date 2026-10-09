import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getJobRun, getJobSteps, readWorkflow } from './workflow-utils.js';

const ciWorkflow = readWorkflow('.github/workflows/ci.yml');

test('CI defines the expected jobs', () => {
  assert.deepEqual(Object.keys(ciWorkflow.jobs).sort(), [
    'e2e',
    'lint',
    'package',
    'quality',
    'release-notes',
    'smoke',
    'test'
  ]);
});

test('CI quality job runs the protected-branch checks', () => {
  const qualityJob = ciWorkflow.jobs.quality;
  const qualitySteps = getJobSteps(ciWorkflow, 'quality');
  const auditStep = qualityJob.steps.find((step) => step.name === 'Audit production dependencies');
  const pullRequestReleaseStep = qualityJob.steps.find(
    (step) => step.name === 'Validate release metadata on pull request'
  );
  const pushReleaseStep = qualityJob.steps.find(
    (step) => step.name === 'Validate release metadata on push'
  );

  assert.equal(getJobRun(ciWorkflow, 'quality'), 'ubuntu-latest');
  assert.ok(qualitySteps.includes('Run lint checks'));
  assert.ok(qualitySteps.includes('Run type checks'));
  assert.ok(qualitySteps.includes('Run tests with 100% coverage'));
  assert.match(auditStep.run, /npm audit --omit=dev/);
  assert.match(pullRequestReleaseStep.run, /BASE_REF=origin\/\$\{\{ github\.base_ref \}\}/);
  assert.match(pushReleaseStep.run, /BASE_REF=\$\{\{ github\.event\.before \}\}/);
});

test('CI release-notes job validates only release-relevant changes', () => {
  const releaseNotesJob = ciWorkflow.jobs['release-notes'];
  const pullRequestStep = releaseNotesJob.steps.find(
    (step) => step.name === 'Validate release metadata on pull request'
  );
  const pushStep = releaseNotesJob.steps.find(
    (step) => step.name === 'Validate release metadata on push'
  );

  assert.match(pullRequestStep.run, /BASE_REF=origin\/\$\{\{ github\.base_ref \}\}/);
  assert.match(pushStep.run, /BASE_REF=\$\{\{ github\.event\.before \}\}/);
  assert.match(pullRequestStep.run, /scripts\/check-release\.mjs/);
  assert.match(pushStep.run, /scripts\/check-release\.mjs/);
});

test('CI lint job runs JavaScript, HTML, and Markdown linters', () => {
  assert.equal(getJobRun(ciWorkflow, 'lint'), 'ubuntu-latest');
  assert.ok(getJobSteps(ciWorkflow, 'lint').includes('Run linters'));
});

test('CI package job smoke-tests the npm pack tarball', () => {
  assert.equal(getJobRun(ciWorkflow, 'package'), 'ubuntu-latest');
  assert.ok(getJobSteps(ciWorkflow, 'package').includes('Smoke-test npm pack tarball'));
});

test('CI e2e job installs Playwright and runs browser UI tests', () => {
  assert.equal(getJobRun(ciWorkflow, 'e2e'), 'ubuntu-latest');
  assert.ok(getJobSteps(ciWorkflow, 'e2e').includes('Install Playwright browsers'));
  assert.ok(getJobSteps(ciWorkflow, 'e2e').includes('Run browser UI tests'));
});

test('CI smoke job builds and runs the Docker image', () => {
  const smokeSteps = getJobSteps(ciWorkflow, 'smoke');
  const smokeScript = ciWorkflow.jobs.smoke.steps.find(
    (step) => step.name === 'Smoke-test the built container image'
  )?.run;

  assert.ok(smokeSteps.includes('Build Docker image'));
  assert.ok(smokeSteps.includes('Smoke-test the built container image'));
  const buildStep = ciWorkflow.jobs.smoke.steps.find((step) => step.name === 'Build Docker image');
  assert.match(buildStep.run, /docker build -t yesornoaas:ci \./);
  assert.match(smokeScript, /docker run -d --name yesornoaas-ci -p 3000:3000 yesornoaas:ci/);
  assert.doesNotMatch(smokeScript, /node src\/server\.js/);
  assert.match(smokeScript, /docker run -d --name yesornoaas-ci-alt -e PORT=8080 -p 8080:8080 yesornoaas:ci/);
  assert.match(smokeScript, /docker exec yesornoaas-ci id -u/);
  assert.match(smokeScript, /docker stop --time=30 yesornoaas-ci/);
  assert.match(smokeScript, /docker wait yesornoaas-ci/);
  assert.match(smokeScript, /grep -q 'data-mode="404"' root\.txt/);
  assert.match(smokeScript, /grep -q 'data-mode="404"' unknown\.txt/);
  assert.doesNotMatch(smokeScript, /Use \/api\/yes, \/api\/no, or \/api\/random/);
});
