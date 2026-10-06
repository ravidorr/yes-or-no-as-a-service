import { isExecutedModule } from '../src/run-if-main.js';

export async function checkDockerHealth({
  fetchImpl = globalThis.fetch,
  port = process.env.PORT ?? '3000',
  exit = process.exit
} = {}) {
  const response = await fetchImpl(`http://127.0.0.1:${port}/health`);

  if (response.status !== 200) {
    exit(1);
    return { healthy: false, reason: 'status' };
  }

  const body = await response.json();

  if (body.status !== 'YESorNOaaS' || typeof body.version !== 'string') {
    exit(1);
    return { healthy: false, reason: 'body' };
  }

  return { healthy: true, body };
}

export async function runDockerHealthcheckCli(options = {}) {
  return checkDockerHealth(options);
}

export async function runDockerHealthcheckCliIfMain({
  isExecutedModuleImpl = isExecutedModule,
  ...options
} = {}) {
  if (isExecutedModuleImpl(import.meta.url)) {
    await runDockerHealthcheckCli(options);
  }
}

await runDockerHealthcheckCliIfMain();
