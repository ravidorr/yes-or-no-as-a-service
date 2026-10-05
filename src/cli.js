#!/usr/bin/env node

import { isExecutedModule } from './run-if-main.js';
import {
  DEFAULT_RANDOM_NUMBER_SOURCE,
  NO_RESPONSE,
  selectRandomAnswer,
  YES_RESPONSE
} from './responses.js';

export const USAGE = 'Usage: yesornoaas <yes|no|random>\n';

export function runCli({
  argv = process.argv,
  stdout = process.stdout,
  stderr = process.stderr,
  exit = process.exit.bind(process),
  randomNumberSource = DEFAULT_RANDOM_NUMBER_SOURCE
} = {}) {
  const command = argv[2];

  if (command === 'yes') {
    stdout.write(`${YES_RESPONSE}\n`);
    return 0;
  }

  if (command === 'no') {
    stdout.write(`${NO_RESPONSE}\n`);
    return 0;
  }

  if (command === 'random') {
    stdout.write(`${selectRandomAnswer(randomNumberSource)}\n`);
    return 0;
  }

  stderr.write(USAGE);
  exit(1);
  return 1;
}

export function runIfMain({
  moduleUrl = import.meta.url,
  argvPath = process.argv[1],
  start = runCli
} = {}) {
  if (isExecutedModule(moduleUrl, argvPath)) {
    start();
  }
}

runIfMain();
