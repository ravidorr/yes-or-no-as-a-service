#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { isExecutedModule } from './run-if-main.js';
import packageJson from '../package.json' with { type: 'json' };
import {
  DEFAULT_RANDOM_NUMBER_SOURCE,
  NO_RESPONSE,
  selectRandomAnswer,
  YES_RESPONSE
} from './responses.js';

function registerAnswerTool(server, name, title, response, { idempotentHint = true } = {}) {
  server.registerTool(
    name,
    {
      title,
      description: `Return ${response} for any request.`,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint,
        openWorldHint: false
      }
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: response
        }
      ]
    })
  );
}

export function createRandomToolHandler(randomNumberSource = DEFAULT_RANDOM_NUMBER_SOURCE) {
  return async () => ({
    content: [
      {
        type: 'text',
        text: selectRandomAnswer(randomNumberSource)
      }
    ]
  });
}

function registerRandomAnswerTool(server, randomNumberSource) {
  server.registerTool(
    'random',
    {
      title: 'Random',
      description: 'Return Yes! or No! at random for any request.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    createRandomToolHandler(randomNumberSource)
  );
}

export function createMcpServer({
  randomNumberSource = DEFAULT_RANDOM_NUMBER_SOURCE
} = {}) {
  const server = new McpServer({
    name: 'yesornoaas',
    version: packageJson.version
  });

  registerAnswerTool(server, 'yes', 'Yes', YES_RESPONSE);
  registerAnswerTool(server, 'no', 'No', NO_RESPONSE);
  registerRandomAnswerTool(server, randomNumberSource);

  return server;
}

export async function runMcpServer({
  createServer = createMcpServer,
  transportFactory = () => new StdioServerTransport()
} = {}) {
  const server = createServer();
  const transport = transportFactory();

  await server.connect(transport);
}

export function exitWithCode(code, exitImpl = process.exit.bind(process)) {
  exitImpl(code);
}

export function createDefaultExitHandler(exit = exitWithCode) {
  return (code) => exit(code);
}

export function runMcpServerCli({
  run = runMcpServer,
  exit = createDefaultExitHandler()
} = {}) {
  return run().catch((error) => {
    console.error(error);
    exit(1);
  });
}

export function runIfMain({
  moduleUrl = import.meta.url,
  argvPath = process.argv[1],
  start = runMcpServerCli
} = {}) {
  if (isExecutedModule(moduleUrl, argvPath)) {
    start();
  }
}

runIfMain();
