export const YES_RESPONSE = 'Yes!';
export const NO_RESPONSE = 'No!';
export const SERVICE_NAME = 'YESorNOaaS';
export const UNKNOWN_ROUTE_HINT =
  'Use /api/yes, /api/no, or /api/random. Example: GET /api/yes -> Yes!';

export const DEFAULT_RANDOM_NUMBER_SOURCE = Math.random;

export function selectRandomAnswer(randomNumberSource = DEFAULT_RANDOM_NUMBER_SOURCE) {
  return randomNumberSource() < 0.5 ? YES_RESPONSE : NO_RESPONSE;
}
