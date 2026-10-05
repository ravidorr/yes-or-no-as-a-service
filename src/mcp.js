#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import packageJson from '../package.json' with { type: 'json' };
import { NO_RESPONSE, YES_RESPONSE } from './responses.js';

function registerAnswerTool(server, name, title, response) {
  server.registerTool(
    name,
    {
      title,
      description: `Return ${response} for any request.`,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
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

export function createMcpServer() {
  const server = new McpServer({
    name: 'yornaas',
    version: packageJson.version
  });

  registerAnswerTool(server, 'yes', 'Yes', YES_RESPONSE);
  registerAnswerTool(server, 'no', 'No', NO_RESPONSE);

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
  if (moduleUrl === pathToFileURL(resolve(argvPath)).href) {
    start();
  }
}

runIfMain();
