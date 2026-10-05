import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getJobSteps, readWorkflow } from './workflow-utils.js';

const releaseWorkflow = readWorkflow('.github/workflows/release.yml');

test('Release job publishes the production image to GHCR on version bump', () => {
  const releaseJob = releaseWorkflow.jobs.release;
  const releaseSteps = getJobSteps(releaseWorkflow, 'release');
  const publishStep = releaseJob.steps.find((step) => step.name === 'Publish to npm');

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
  assert.ok(releaseSteps.includes('Create GitHub release'));
  assert.match(publishStep.run, /npm publish --access public --provenance/);
  assert.match(publishStep.run, /already on npm; skipping publish/);

  const buildPushIndex = releaseSteps.indexOf('Build and push container image');
  const npmPublishIndex = releaseSteps.indexOf('Publish to npm');
  const releaseCreateIndex = releaseSteps.indexOf('Create GitHub release');

  assert.ok(buildPushIndex >= 0);
  assert.ok(npmPublishIndex > buildPushIndex);
  assert.ok(releaseCreateIndex > npmPublishIndex);
});
