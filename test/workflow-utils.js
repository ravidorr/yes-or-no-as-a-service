import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

export function readWorkflow(relativePath) {
  return parseYaml(readFileSync(relativePath, 'utf8'));
}

export function getJobSteps(workflow, jobName) {
  return workflow.jobs[jobName].steps.map((step) => step.name);
}

export function getJobRun(workflow, jobName) {
  return workflow.jobs[jobName]['runs-on'];
}
