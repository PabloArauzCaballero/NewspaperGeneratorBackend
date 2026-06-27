import 'dotenv/config';

const baseUrl = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}/${process.env.API_PREFIX || 'api/v1'}`).replace(/\/$/, '');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(method: string, path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': `security-smoke-${Date.now()}`,
      'X-Request-Id': 'security-smoke-request-123'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

async function main() {
  console.log(`Running security smoke against ${baseUrl}`);
  const live = await request('GET', '/health/live');
  assert(live.response.status === 200, `Expected /health/live 200, got ${live.response.status}`);
  for (const [header, expected] of [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['referrer-policy', 'no-referrer']
  ] as const) {
    assert(live.response.headers.get(header) === expected, `Expected security header ${header}=${expected}`);
  }
  assert(live.response.headers.get('x-request-id') === 'security-smoke-request-123', 'Expected request id propagation');

  const bad = await request('POST', '/auth/login', { email: 'not-an-email', password: '' });
  assert(bad.response.status === 400, `Expected validation error 400, got ${bad.response.status}`);
  assert(bad.body?.requestId, 'Expected standardized error response to include requestId');
  assert(Array.isArray(bad.body?.issues), 'Expected validation error response to include issues');

  const attempts = Number(process.env.SECURITY_SMOKE_RATE_LIMIT_ATTEMPTS ?? 12);
  let saw429 = false;
  for (let index = 0; index < attempts; index += 1) {
    const result = await request('POST', '/auth/login', { email: `missing-${Date.now()}-${index}@periodico.test`, password: 'wrong-password' });
    if (result.response.status === 429) saw429 = true;
  }
  if (process.env.RATE_LIMIT_ENABLED !== 'false') {
    assert(saw429, 'Expected auth rate limit to return at least one 429');
  }

  console.log('Security smoke OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
