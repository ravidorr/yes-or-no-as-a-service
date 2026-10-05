import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const ciWorkflowPath = resolve('.github/workflows/ci.yml');

test('CI lint job runs JavaScript, HTML, and Markdown linters', () => {
  const workflow = readFileSync(ciWorkflowPath, 'utf8');
  const lintJob = workflow.match(/^  lint:\n(?<body>(?:    .*\n|\n)*)/m)?.groups?.body;

  assert.ok(lintJob);
  assert.match(lintJob, /^    runs-on: ubuntu-latest$/m);
  assert.match(lintJob, /node-version: 22/);
  assert.match(lintJob, /run: npm run lint/);
});

test('CI smoke job builds the Docker image before endpoint checks', () => {
  const workflow = readFileSync(ciWorkflowPath, 'utf8');
  const smokeJob = workflow.match(/^  smoke:\n(?<body>(?:    .*\n|\n)*)/m)?.groups?.body;

  assert.ok(smokeJob);
  assert.match(smokeJob, /docker build -t yornaas:ci \./);
});

test('CI smoke job starts the app and checks public endpoint contracts', () => {
  const workflow = readFileSync(ciWorkflowPath, 'utf8');
  const smokeJob = workflow.match(/^  smoke:\n(?<body>(?:    .*\n|\n)*)/m)?.groups?.body;

  assert.ok(smokeJob);
  assert.match(smokeJob, /^    runs-on: ubuntu-latest$/m);
  assert.match(smokeJob, /^      - name: Set up Node\.js\n        uses: actions\/setup-node@v7\n        with:\n          node-version: 22\n          cache: npm$/m);
  assert.match(smokeJob, /^      - name: Install dependencies\n        run: npm ci$/m);
  assert.match(smokeJob, /node src\/server\.js > server\.log 2>&1 &/);
  assert.match(smokeJob, /trap cleanup EXIT/);
  assert.match(smokeJob, /kill -9 "\$server_pid"/);
  assert.match(smokeJob, /curl --fail --silent --max-time 5 --output \/dev\/null http:\/\/127\.0\.0\.1:3000\/health/);
  assert.match(smokeJob, /--max-time 5 --output api-yes\.txt/);
  assert.match(smokeJob, /--max-time 5 --output api-no\.txt/);
  assert.match(smokeJob, /--max-time 5 --output health\.json/);
  assert.match(smokeJob, /--max-time 5 --output version\.txt/);
  assert.match(smokeJob, /--max-time 5 --output metrics\.txt/);
  assert.match(smokeJob, /--max-time 5 --output yes\.html/);
  assert.match(smokeJob, /--max-time 5 --output no\.html/);
  assert.match(smokeJob, /--max-time 5 --output root\.txt/);
  assert.match(smokeJob, /--max-time 5 --output unknown\.txt/);
  assert.match(smokeJob, /cat server\.log/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/api\/yes/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/api\/no/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/health/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/version/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/metrics/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/yes/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/no/);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\//);
  assert.match(smokeJob, /http:\/\/127\.0\.0\.1:3000\/unknown-path/);
  assert.match(smokeJob, /\[ "\$\(cat api-yes\.txt\)" = "Yes!" \]/);
  assert.match(smokeJob, /\[ "\$\(cat api-no\.txt\)" = "No!" \]/);
  assert.match(smokeJob, /health\.status !== "YorNaaS"/);
  assert.match(smokeJob, /EXPECTED_VERSION="\$expected_version"/);
  assert.match(smokeJob, /\[ "\$\(cat version\.txt\)" = "\$expected_version" \]/);
  assert.match(smokeJob, /\[ "\$metrics_type" = "text\/plain; charset=utf-8; version=0\.0\.4" \]/);
  assert.match(smokeJob, /grep -q 'yornaas_http_requests_total' metrics\.txt/);
  assert.match(smokeJob, /grep -q 'data-answer="yes"' yes\.html/);
  assert.match(smokeJob, /grep -q 'data-answer="no"' no\.html/);
  assert.match(smokeJob, /root_status="\$\(curl --silent --show-error --max-time 5 --output root\.txt --write-out '%\{http_code\}' http:\/\/127\.0\.0\.1:3000\/\)"/);
  assert.match(smokeJob, /\[ "\$root_status" = "404" \]/);
  assert.match(smokeJob, /grep -q 'Use \/api\/yes or \/api\/no' root\.txt/);
  assert.match(smokeJob, /unknown_status="\$\(curl --silent --show-error --max-time 5 --output unknown\.txt --write-out '%\{http_code\}' http:\/\/127\.0\.0\.1:3000\/unknown-path\)"/);
  assert.match(smokeJob, /\[ "\$unknown_status" = "404" \]/);
});
