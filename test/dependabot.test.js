import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readWorkflow } from './workflow-utils.js';

const dependabotConfig = readWorkflow('.github/dependabot.yml');

test('Dependabot ignores unresolvable transitive advisories', () => {
  const npmUpdate = dependabotConfig.updates.find(
    (update) => update['package-ecosystem'] === 'npm'
  );
  const ignored = npmUpdate.ignore.map((entry) => entry['dependency-name']).sort();

  assert.deepEqual(ignored, ['katex', 'smol-toml', 'tmp', 'uuid']);
});
