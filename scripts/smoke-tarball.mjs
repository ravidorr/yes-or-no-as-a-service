import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isExecutedModule } from '../src/run-if-main.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

function createRun(spawnImpl = spawn) {
  return (command, args, options = {}) =>
    new Promise((resolvePromise, reject) => {
      const child = spawnImpl(command, args, {
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

export async function runSmokeTarball({
  cwd = process.cwd(),
  spawnImpl = spawn,
  mkdtempSyncImpl = mkdtempSync,
  rmSyncImpl = rmSync,
  readFileSyncImpl = readFileSync,
  resolveImpl = resolve,
  ClientImpl = Client,
  StdioClientTransportImpl = StdioClientTransport,
  tmpdirImpl = tmpdir,
  joinImpl = join,
  assertImpl = assert
} = {}) {
  const run = createRun(spawnImpl);
  const tempDir = mkdtempSyncImpl(joinImpl(tmpdirImpl(), 'yesornoaas-pack-'));
  const prefixDir = joinImpl(tempDir, 'prefix');

  try {
    const packOutput = await run('npm', ['pack', '--json'], { cwd });
    const packEntries = JSON.parse(packOutput.stdout);
    const tarballName = packEntries[0]?.filename;

    assertImpl.ok(tarballName, 'npm pack did not return a tarball filename');

    await run('npm', ['install', '-g', joinImpl(cwd, tarballName), '--prefix', prefixDir]);

    const yesOutput = await run(joinImpl(prefixDir, 'bin', 'yesornoaas'), ['yes']);
    assertImpl.equal(yesOutput.stdout.trim(), 'Yes!');

    const noOutput = await run(joinImpl(prefixDir, 'bin', 'yesornoaas'), ['no']);
    assertImpl.equal(noOutput.stdout.trim(), 'No!');

    const randomOutput = await run(joinImpl(prefixDir, 'bin', 'yesornoaas'), ['random']);
    assertImpl.match(randomOutput.stdout.trim(), /^(Yes!|No!)$/);

    const mcpPath = joinImpl(prefixDir, 'bin', 'yesornoaas-mcp');
    const client = new ClientImpl({ name: 'yesornoaas-pack-smoke', version: '0.0.0' });
    const transport = new StdioClientTransportImpl({
      command: mcpPath,
      cwd,
      stderr: 'pipe'
    });

    await client.connect(transport);
    const tools = await client.listTools();
    assertImpl.deepEqual(
      tools.tools.map((tool) => tool.name),
      ['yes', 'no', 'random']
    );
    await client.close();

    const packageJson = JSON.parse(readFileSyncImpl(resolveImpl('package.json'), 'utf8'));
    assertImpl.equal(packageJson.name, '@ravidor/yesornoaas');

    return { tarballName };
  } finally {
    rmSyncImpl(tempDir, { recursive: true, force: true });
  }
}

export async function runSmokeTarballCli({
  runSmokeTarballImpl = runSmokeTarball,
  stdout = process.stdout
} = {}) {
  await runSmokeTarballImpl();
  stdout.write('Tarball smoke test passed.\n');
}

export async function runSmokeTarballCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    await runSmokeTarballCli(options);
  }
}

await runSmokeTarballCliIfMain();
