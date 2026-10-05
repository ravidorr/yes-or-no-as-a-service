import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const releaseWorkflowPath = resolve('.github/workflows/release.yml');

test('Release job publishes the production image to GHCR on version bump', () => {
  const workflow = readFileSync(releaseWorkflowPath, 'utf8');

  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /^  release:\n    needs: detect\n    if: needs\.detect\.outputs\.bumped == 'true'/m);

  const releaseJob = workflow.match(/^  release:\n(?<body>(?:    .*\n|\n)*)/m)?.groups?.body;

  assert.ok(releaseJob);
  assert.match(releaseJob, /^    permissions:\n      contents: write\n      id-token: write\n      packages: write$/m);
  assert.match(releaseJob, /^      - name: Log in to GHCR\n        uses: docker\/login-action@v3\n        with:\n          registry: ghcr\.io\n          username: \$\{\{ github\.actor \}\}\n          password: \$\{\{ github\.token \}\}$/m);
  assert.match(releaseJob, /^      - name: Set up Node\.js\n        uses: actions\/setup-node@v7\n        with:\n          node-version: 22\n          registry-url: https:\/\/registry\.npmjs\.org$/m);
  assert.match(releaseJob, /^      - name: Set up Docker Buildx\n        uses: docker\/setup-buildx-action@v3$/m);
  assert.match(releaseJob, /^      - name: Generate container metadata\n        id: container_meta\n        uses: docker\/metadata-action@v5\n        with:\n          images: ghcr\.io\/\$\{\{ github\.repository \}\}\n          tags: \|\n            type=raw,value=\$\{\{ needs\.detect\.outputs\.version \}\}\n            type=raw,value=latest\n          labels: \|\n            org\.opencontainers\.image\.source=\$\{\{ github\.repositoryUrl \}\}\n            org\.opencontainers\.image\.revision=\$\{\{ github\.sha \}\}\n            org\.opencontainers\.image\.version=\$\{\{ needs\.detect\.outputs\.version \}\}$/m);
  assert.match(releaseJob, /^      - name: Build and push container image\n        uses: docker\/build-push-action@v6\n        with:\n          context: \.\n          file: \.\/Dockerfile\n          push: true\n          tags: \$\{\{ steps\.container_meta\.outputs\.tags \}\}\n          labels: \$\{\{ steps\.container_meta\.outputs\.labels \}\}$/m);
  assert.match(releaseJob, /^      - name: Publish to npm\n        run: npm publish --access public --provenance --ignore-scripts$/m);
  assert.match(releaseJob, /^      - name: Create GitHub release\n        env:\n          GH_TOKEN: \$\{\{ github\.token \}\}\n          RELEASE_NOTES: \$\{\{ needs\.detect\.outputs\.notes \}\}\n          RELEASE_TAG: \$\{\{ needs\.detect\.outputs\.tag \}\}\n        run: \|\n          printf '%s\\n' "\$RELEASE_NOTES" > release-notes\.md\n          if gh release view "\$RELEASE_TAG" >\/dev\/null 2>&1; then\n            echo "Release \$RELEASE_TAG already exists; skipping create\."\n          else\n            gh release create "\$RELEASE_TAG" \\\n              --title "\$RELEASE_TAG" \\\n              --notes-file release-notes\.md \\\n              --target "\$\{\{ github\.sha \}\}"\n          fi$/m);

  const buildPushIndex = releaseJob.indexOf('- name: Build and push container image');
  const npmPublishIndex = releaseJob.indexOf('- name: Publish to npm');
  const releaseCreateIndex = releaseJob.indexOf('- name: Create GitHub release');

  assert.ok(buildPushIndex >= 0);
  assert.ok(npmPublishIndex > buildPushIndex);
  assert.ok(releaseCreateIndex > npmPublishIndex);
});
