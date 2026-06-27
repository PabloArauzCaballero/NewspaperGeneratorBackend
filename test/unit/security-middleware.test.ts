import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { securityHeadersMiddleware } from '../../src/security/security-headers.middleware';
import { requestContextMiddleware, REQUEST_ID_HEADER } from '../../src/common/middleware/request-context.middleware';

function fakeResponse() {
  const headers = new Map<string, string>();
  return {
    headers,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
    getHeader(name: string) { return headers.get(name.toLowerCase()); }
  };
}

describe('security middleware', () => {
  it('sets hardening headers required for production APIs', () => {
    const response = fakeResponse();
    let called = false;
    securityHeadersMiddleware({ originalUrl: '/api/v1/health/live' } as any, response as any, () => { called = true; });
    assert.equal(called, true);
    assert.equal(response.getHeader('x-content-type-options'), 'nosniff');
    assert.equal(response.getHeader('x-frame-options'), 'DENY');
    assert.equal(response.getHeader('referrer-policy'), 'no-referrer');
    assert.match(String(response.getHeader('content-security-policy')), /frame-ancestors 'none'/);
  });

  it('propagates a safe request id and rejects unsafe ids by replacing them', () => {
    const response = fakeResponse();
    const request = { headers: { [REQUEST_ID_HEADER]: 'req-safe-123456' } } as any;
    requestContextMiddleware(request, response as any, () => undefined);
    assert.equal(request.requestId, 'req-safe-123456');
    assert.equal(response.getHeader(REQUEST_ID_HEADER), 'req-safe-123456');

    const unsafeResponse = fakeResponse();
    const unsafeRequest = { headers: { [REQUEST_ID_HEADER]: '<script>' } } as any;
    requestContextMiddleware(unsafeRequest, unsafeResponse as any, () => undefined);
    assert.notEqual(unsafeRequest.requestId, '<script>');
    assert.match(String(unsafeRequest.requestId), /^[0-9a-f-]{36}$/);
  });
});
