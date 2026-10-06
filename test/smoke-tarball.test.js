import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { runSmokeTarballCliIfMain, runSmokeTarball } from '../scripts/smoke-tarball.mjs';

function createSpawnMock(localThis) {
  return (_command, args) => {
    localThis.commands.push(args.join(' '));

    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();

    queueMicrotask(() => {
      if (args[0] === 'pack') {
        child.stdout.emit('data', JSON.stringify([{ filename: 'yesornoaas-1.0.0.tgz' }]));
      } else if (args.at(-1) === 'yes') {
        child.stdout.emit('data', 'Yes!\n');
      } else if (args.at(-1) === 'no') {
        child.stdout.emit('data', 'No!\n');
      } else if (args.at(-1) === 'random') {
        child.stdout.emit('data', 'No!\n');
      }

      child.emit('close', 0);
    });

    return child;
  };
}

test('runSmokeTarball validates the packed CLI and MCP binaries', async () => {
  const localThis = {
    commands: [],
    connected: false,
    listedTools: false,
    closed: false
  };

  class MockClient {
    constructor() {
      this.connect = async () => {
        localThis.connected = true;
      };
      this.listTools = async () => {
        localThis.listedTools = true;
        return { tools: [{ name: 'yes' }, { name: 'no' }, { name: 'random' }] };
      };
      this.close = async () => {
        localThis.closed = true;
      };
    }
  }

  class MockTransport {}

  const result = await runSmokeTarball({
    cwd: '/tmp/project',
    spawnImpl: createSpawnMock(localThis),
    mkdtempSyncImpl: () => '/tmp/yesornoaas-pack-test',
    rmSyncImpl: () => {},
    readFileSyncImpl: () => JSON.stringify({ name: '@ravidor/yesornoaas' }),
    resolveImpl: (path) => path,
    joinImpl: (...parts) => parts.join('/'),
    tmpdirImpl: () => '/tmp',
    ClientImpl: MockClient,
    StdioClientTransportImpl: MockTransport
  });

  assert.equal(result.tarballName, 'yesornoaas-1.0.0.tgz');
  assert.match(localThis.commands.join('\n'), /pack/);
  assert.match(localThis.commands.join('\n'), /yesornoaas-1.0.0.tgz/);
  assert.equal(localThis.connected, true);
  assert.equal(localThis.listedTools, true);
  assert.equal(localThis.closed, true);
});

test('runSmokeTarballCliIfMain delegates to the smoke runner', async () => {
  const localThis = {
    stdout: ''
  };

  await runSmokeTarballCliIfMain({
    isExecutedModuleImpl: () => true,
    runSmokeTarballImpl: async () => ({ tarballName: 'yesornoaas-1.0.0.tgz' }),
    stdout: {
      write(value) {
        localThis.stdout += value;
      }
    }
  });

  assert.match(localThis.stdout, /Tarball smoke test passed/);
});

test('runSmokeTarball rejects when npm pack does not return a tarball', async () => {
  await assert.rejects(
    () =>
      runSmokeTarball({
        spawnImpl: () => {
          const child = new EventEmitter();
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          queueMicrotask(() => {
            child.stdout.emit('data', '[]');
            child.emit('close', 0);
          });
          return child;
        },
        mkdtempSyncImpl: () => '/tmp/yesornoaas-pack-test',
        rmSyncImpl: () => {},
        readFileSyncImpl: () => '{}',
        resolveImpl: (path) => path,
        joinImpl: (...parts) => parts.join('/'),
        tmpdirImpl: () => '/tmp'
      }),
    /tarball filename/
  );
});

test('runSmokeTarball propagates spawn errors', async () => {
  await assert.rejects(
    () =>
      runSmokeTarball({
        spawnImpl: () => {
          const child = new EventEmitter();
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          queueMicrotask(() => {
            child.emit('error', new Error('spawn failed'));
          });
          return child;
        },
        mkdtempSyncImpl: () => '/tmp/yesornoaas-pack-test',
        rmSyncImpl: () => {},
        readFileSyncImpl: () => '{}',
        resolveImpl: (path) => path,
        joinImpl: (...parts) => parts.join('/'),
        tmpdirImpl: () => '/tmp'
      }),
    /spawn failed/
  );
});

test('runSmokeTarball propagates command failures from stderr output', async () => {
  await assert.rejects(
    () =>
      runSmokeTarball({
        spawnImpl: () => {
          const child = new EventEmitter();
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          queueMicrotask(() => {
            child.stderr.emit('data', 'pack failed');
            child.emit('close', 1);
          });
          return child;
        },
        mkdtempSyncImpl: () => '/tmp/yesornoaas-pack-test',
        rmSyncImpl: () => {},
        readFileSyncImpl: () => '{}',
        resolveImpl: (path) => path,
        joinImpl: (...parts) => parts.join('/'),
        tmpdirImpl: () => '/tmp'
      }),
    /pack failed/
  );
});

test('runSmokeTarball propagates command failures from stdout output', async () => {
  await assert.rejects(
    () =>
      runSmokeTarball({
        spawnImpl: () => {
          const child = new EventEmitter();
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          queueMicrotask(() => {
            child.stdout.emit('data', 'pack failed on stdout');
            child.emit('close', 1);
          });
          return child;
        },
        mkdtempSyncImpl: () => '/tmp/yesornoaas-pack-test',
        rmSyncImpl: () => {},
        readFileSyncImpl: () => '{}',
        resolveImpl: (path) => path,
        joinImpl: (...parts) => parts.join('/'),
        tmpdirImpl: () => '/tmp'
      }),
    /pack failed on stdout/
  );
});
