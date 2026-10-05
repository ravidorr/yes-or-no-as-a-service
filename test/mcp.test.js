import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import packageJson from '../package.json' with { type: 'json' };
import { pathToFileURL } from 'node:url';
import {
  createDefaultExitHandler,
  createMcpServer,
  createRandomToolHandler,
  exitWithCode,
  runIfMain,
  runMcpServer,
  runMcpServerCli
} from '../src/mcp.js';

const mcpServerPath = resolve('src/mcp.js');

test('MCP server exposes yes, no, and random tools', async () => {
  const client = new Client({
    name: 'yesornoaas-test-client',
    version: '0.0.0'
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mcpServerPath],
    cwd: process.cwd(),
    stderr: 'pipe'
  });

  try {
    await client.connect(transport);

    assert.deepEqual(client.getServerVersion(), {
      name: 'yesornoaas',
      version: packageJson.version
    });

    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name),
      ['yes', 'no', 'random']
    );

    const yesResult = await client.callTool({
      name: 'yes',
      arguments: {
        question: 'Can I?',
        payload: { any: 'thing' }
      }
    });

    assert.deepEqual(yesResult.content, [{ type: 'text', text: 'Yes!' }]);

    const noResult = await client.callTool({
      name: 'no',
      arguments: {
        question: 'Can I?',
        payload: { any: 'thing' }
      }
    });

    assert.deepEqual(noResult.content, [{ type: 'text', text: 'No!' }]);

    const randomResult = await client.callTool({
      name: 'random',
      arguments: {
        question: 'Can I?'
      }
    });

    assert.ok(randomResult.content?.[0]?.type === 'text');
    assert.ok(['Yes!', 'No!'].includes(randomResult.content?.[0]?.text));
  } finally {
    await client.close();
  }
});

test('createRandomToolHandler returns Yes! with an injected source', async () => {
  const result = await createRandomToolHandler(() => 0)();

  assert.deepEqual(result.content, [{ type: 'text', text: 'Yes!' }]);
});

test('createRandomToolHandler returns No! with an injected source', async () => {
  const result = await createRandomToolHandler(() => 0.5)();

  assert.deepEqual(result.content, [{ type: 'text', text: 'No!' }]);
});

test('runMcpServer connects using the provided transport factory', async () => {
  let started = false;

  await runMcpServer({
    createServer: createMcpServer,
    transportFactory: () => ({
      start: async () => {
        started = true;
      },
      close: async () => {},
      send: async () => {}
    })
  });

  assert.equal(started, true);
});

test('createDefaultExitHandler returns an exit callback', () => {
  let exitCode;

  createDefaultExitHandler((code) => {
    exitCode = code;
  })(1);

  assert.equal(exitCode, 1);
});

test('runMcpServerCli resolves when startup succeeds', async () => {
  await runMcpServerCli({
    run: () => Promise.resolve()
  });
});

test('runMcpServerCli reports errors and exits', async (t) => {
  const error = new Error('startup failed');
  const errorLog = t.mock.method(console, 'error');
  let exitCode;

  await runMcpServerCli({
    run: () => Promise.reject(error),
    exit: (code) => {
      exitCode = code;
    }
  });

  assert.equal(errorLog.mock.calls[0]?.arguments[0], error);
  assert.equal(exitCode, 1);
});

test('exitWithCode terminates the process with the given code', () => {
  let exitCode;

  exitWithCode(1, (code) => {
    exitCode = code;
  });

  assert.equal(exitCode, 1);
});

test('runIfMain starts the MCP CLI for the executed module', (t) => {
  const start = t.mock.fn();

  runIfMain({
    moduleUrl: pathToFileURL(mcpServerPath).href,
    argvPath: mcpServerPath,
    start
  });

  assert.equal(start.mock.calls.length, 1);
});

test('runIfMain skips MCP startup when imported as a dependency', (t) => {
  const start = t.mock.fn();

  runIfMain({
    moduleUrl: pathToFileURL(mcpServerPath).href,
    argvPath: resolve('test/mcp.test.js'),
    start
  });

  assert.equal(start.mock.calls.length, 0);
});
