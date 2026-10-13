import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getJobSteps, readWorkflow } from './workflow-utils.js';

const releaseWorkflow = readWorkflow('.github/workflows/release.yml');

test('Release job publishes the production image to GHCR on version bump', () => {
  const releaseJob = releaseWorkflow.jobs.release;
  const releaseSteps = getJobSteps(releaseWorkflow, 'release');

  assert.equal(releaseWorkflow.permissions.contents, 'read');
  assert.equal(releaseJob.if, "needs.detect.outputs.bumped == 'true'");
  assert.deepEqual(releaseJob.permissions, {
    contents: 'write',
    'id-token': 'write',
    packages: 'write'
  });
  assert.ok(releaseSteps.includes('Log in to GHCR'));
  assert.ok(releaseSteps.includes('Build and push container image'));
  assert.ok(releaseSteps.includes('Publish to npm'));
  assert.ok(releaseSteps.includes('Verify npm release'));
  assert.ok(releaseSteps.includes('Create GitHub release'));

  const buildPushIndex = releaseSteps.indexOf('Build and push container image');
  const npmPublishIndex = releaseSteps.indexOf('Publish to npm');
  const verifyIndex = releaseSteps.indexOf('Verify npm release');
  const releaseCreateIndex = releaseSteps.indexOf('Create GitHub release');

  assert.ok(buildPushIndex >= 0);
  assert.ok(npmPublishIndex > buildPushIndex);
  assert.ok(verifyIndex > npmPublishIndex);
  assert.ok(releaseCreateIndex > verifyIndex);
});

test('Release npm steps delegate to the shared registry script', () => {
  const releaseJob = releaseWorkflow.jobs.release;
  const publishStep = releaseJob.steps.find((step) => step.name === 'Publish to npm');
  const verifyStep = releaseJob.steps.find((step) => step.name === 'Verify npm release');

  assert.match(publishStep.run, /scripts\/release-npm-registry\.sh publish/);
  assert.match(publishStep.run, /require\('\.\/package\.json'\)\.name/);
  assert.match(verifyStep.run, /scripts\/release-npm-registry\.sh verify/);
});
