import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed (${code}): ${stderr || stdout}`));
    });
  });
}

const tempDir = mkdtempSync(join(tmpdir(), 'yesornoaas-pack-'));
const prefixDir = join(tempDir, 'prefix');

try {
  const packOutput = await run('npm', ['pack', '--json'], { cwd: process.cwd() });
  const packEntries = JSON.parse(packOutput.stdout);
  const tarballName = packEntries[0]?.filename;

  assert.ok(tarballName, 'npm pack did not return a tarball filename');

  await run('npm', ['install', '-g', join(process.cwd(), tarballName), '--prefix', prefixDir]);

  const yesOutput = await run(join(prefixDir, 'bin', 'yesornoaas'), ['yes']);
  assert.equal(yesOutput.stdout.trim(), 'Yes!');

  const noOutput = await run(join(prefixDir, 'bin', 'yesornoaas'), ['no']);
  assert.equal(noOutput.stdout.trim(), 'No!');

  const mcpPath = join(prefixDir, 'bin', 'yesornoaas-mcp');
  const client = new Client({ name: 'yesornoaas-pack-smoke', version: '0.0.0' });
  const transport = new StdioClientTransport({
    command: mcpPath,
    cwd: process.cwd(),
    stderr: 'pipe'
  });

  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((tool) => tool.name),
    ['yes', 'no']
  );
  await client.close();

  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(packageJson.name, '@ravidor/yesornoaas');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('Tarball smoke test passed.');
