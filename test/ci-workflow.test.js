import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getJobRun, getJobSteps, readWorkflow } from './workflow-utils.js';

const ciWorkflow = readWorkflow('.github/workflows/ci.yml');

test('CI defines the expected jobs', () => {
  assert.deepEqual(Object.keys(ciWorkflow.jobs).sort(), [
    'e2e',
    'lint',
    'package',
    'release-notes',
    'smoke',
    'test'
  ]);
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
  assert.match(buildStep.run, /docker build -t yornaas:ci \./);
  assert.match(smokeScript, /docker run -d --rm --name yornaas-ci -p 3000:3000 yornaas:ci/);
  assert.doesNotMatch(smokeScript, /node src\/server\.js/);
  assert.match(smokeScript, /docker run -d --rm --name yornaas-ci-alt -e PORT=8080 -p 8080:8080 yornaas:ci/);
  assert.match(smokeScript, /docker stop yornaas-ci/);
});
