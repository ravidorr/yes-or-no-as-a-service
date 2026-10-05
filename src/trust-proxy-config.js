export function parseTrustProxy(value) {
  if (value === undefined || value === '') {
    return false;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('TRUST_PROXY must be true, false, or a non-negative integer');
  }

  return parsed;
}

export function parseTrustProxyConfig(env = process.env) {
  return parseTrustProxy(env.TRUST_PROXY);
}
