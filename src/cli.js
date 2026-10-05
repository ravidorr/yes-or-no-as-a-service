#!/usr/bin/env node

import { NO_RESPONSE, YES_RESPONSE } from './responses.js';

const USAGE = 'Usage: yornaas <yes|no>\n';

const command = process.argv[2];

if (command === 'yes') {
  process.stdout.write(`${YES_RESPONSE}\n`);
} else if (command === 'no') {
  process.stdout.write(`${NO_RESPONSE}\n`);
} else {
  process.stderr.write(USAGE);
  process.exit(1);
}
