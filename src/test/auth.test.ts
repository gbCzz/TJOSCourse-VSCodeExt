import * as assert from 'assert';
import { AuthClient, normalizeBaseUrl } from '../platform/authClient';
import { AuthService } from '../platform/authService';
import { PlatformError } from '../platform/errors';

const baseUrl = 'https://course.example.test/prefix/';
const cookie = 'os_session=synthetic-session; Path=/prefix/; HttpOnly; Secure; Max-Age=3600';
const json = (data: unknown, headers?: Record<string, string>) => new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json', ...headers },
});
const loginResponse = () => json({ ok: true, token: 'unused-token' }, { 'Set-Cookie': cookie });
const meResponse = () => json({ ok: true, username: 'student', display_name: '学生' });

function sequence(responses: Response[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    assert.ok(response, 'Unexpected extra request');
    return response;
  };
  return { fetcher, calls };
}

function hasCode(code: string) {
  return (error: unknown) => error instanceof PlatformError && error.code === code;
}

suite('Authentication (offline)', () => {
  test('normalizes deployment prefixes and rejects unsafe platform addresses', () => {
    assert.strictEqual(normalizeBaseUrl(' https://course.example.test/prefix '), baseUrl);
    for (const invalid of ['', 'http://example.test', 'https://user:pass@example.test',
      'https://example.test/?token=secret', 'https://example.test/#fragment']) {
      assert.throws(() => normalizeBaseUrl(invalid), hasCode('Configuration'));
    }
  });

  test('posts credentials, verifies with Cookie, and saves only the verified session', async () => {
    const { fetcher, calls } = sequence([loginResponse(), meResponse()]);
    const saved = new Map<string, string>();
    const service = new AuthService({ store: async (key, value) => { saved.set(key, value); } },
      url => new AuthClient(url, fetcher));
    const identity = await service.login(baseUrl, 'student', ' password with spaces ');
    assert.strictEqual(identity.username, 'student');
    assert.deepStrictEqual(calls.map(call => call.url), [baseUrl + 'api/auth/login', baseUrl + 'api/auth/me']);
    assert.strictEqual(calls[0].init?.method, 'POST');
    assert.deepStrictEqual(JSON.parse(String(calls[0].init?.body)), { username: 'student', password: ' password with spaces ' });
    assert.strictEqual(calls[1].init?.method, 'GET');
    assert.strictEqual(new Headers(calls[0].init?.headers).get('cookie'), null);
    assert.strictEqual(new Headers(calls[1].init?.headers).get('cookie'), 'os_session=synthetic-session');
    assert.strictEqual(new Headers(calls[1].init?.headers).get('authorization'), null);
    assert.ok(calls.every(call => call.init?.redirect === 'manual'));
    const stored = saved.get(`tongjios.session:${baseUrl}`)!;
    assert.strictEqual(JSON.parse(stored).session.value, 'synthetic-session');
    assert.ok(!stored.includes('password'));
    assert.ok(!stored.includes('unused-token'));
  });

  test('does not persist a session when me rejects it', async () => {
    const { fetcher, calls } = sequence([loginResponse(), new Response('', { status: 401 })]);
    let stored = false;
    const service = new AuthService({ store: async () => { stored = true; } }, url => new AuthClient(url, fetcher));
    await assert.rejects(service.login(baseUrl, 'student', 'secret'), hasCode('Unauthorized'));
    assert.strictEqual(stored, false);
    assert.strictEqual(calls.length, 2);
  });

  for (const [label, response, code] of [
    ['401', () => new Response('private error', { status: 401 }), 'Unauthorized'],
    ['403', () => new Response('', { status: 403 }), 'Forbidden'],
    ['500', () => new Response('', { status: 500 }), 'Server'],
    ['redirect', () => new Response('', { status: 302, headers: { Location: 'https://other.example.test' } }), 'Protocol'],
    ['business failure', () => json({ ok: false, error: 'private error' }), 'Protocol'],
    ['missing ok', () => json({ username: 'student' }), 'Protocol'],
    ['HTML', () => new Response('<html>private error</html>', { headers: { 'Content-Type': 'text/html' } }), 'Protocol'],
    ['invalid JSON', () => new Response('{', { headers: { 'Content-Type': 'application/json' } }), 'Protocol'],
    ['missing cookie', () => json({ ok: true, token: 'not-a-cookie' }), 'Protocol'],
    ['oversized response', () => json({ ok: true, large: 'a'.repeat(1024 * 1024) }), 'Protocol'],
  ] as const) {
    test(`rejects ${label} without retry or exposing raw response`, async () => {
      const { fetcher, calls } = sequence([response()]);
      await assert.rejects(new AuthClient(baseUrl, fetcher).login('student', 'secret'), error => {
        assert.ok(hasCode(code)(error));
        assert.ok(!(error as Error).message.includes('private error'));
        return true;
      });
      assert.strictEqual(calls.length, 1);
    });
  }

  test('rejects a mismatched cookie path before sending me', async () => {
    const { fetcher, calls } = sequence([json({ ok: true }, { 'Set-Cookie': 'os_session=value; Path=/elsewhere' })]);
    await assert.rejects(new AuthClient(baseUrl, fetcher).login('student', 'secret'), hasCode('Protocol'));
    assert.strictEqual(calls.length, 1);
  });

  test('rejects expired and foreign-domain cookies', async () => {
    for (const attributes of ['Max-Age=0', 'Domain=other.example.test']) {
      const { fetcher } = sequence([json({ ok: true }, { 'Set-Cookie': `os_session=value; ${attributes}` })]);
      await assert.rejects(new AuthClient(baseUrl, fetcher).login('student', 'secret'), hasCode('Protocol'));
    }
  });

  test('handles multiple Set-Cookie headers and rotation during identity verification', async () => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', 'irrelevant=value; Path=/');
    headers.append('Set-Cookie', cookie);
    const { fetcher } = sequence([
      new Response('{"ok":true}', { headers }),
      json({ ok: true, username: 'student' }, { 'Set-Cookie': 'os_session=rotated; Path=/prefix/' }),
    ]);
    const client = new AuthClient(baseUrl, fetcher);
    await client.login('student', 'secret');
    assert.strictEqual(client.session?.value, 'rotated');
  });

  test('requires a valid identity', async () => {
    const { fetcher } = sequence([loginResponse(), json({ ok: true })]);
    await assert.rejects(new AuthClient(baseUrl, fetcher).login('student', 'secret'), hasCode('Protocol'));
  });

  test('reports secure storage failure without exposing its error details', async () => {
    const { fetcher } = sequence([loginResponse(), meResponse()]);
    const service = new AuthService({ store: async () => { throw new Error('private secret'); } },
      url => new AuthClient(url, fetcher));
    await assert.rejects(service.login(baseUrl, 'student', 'secret'), hasCode('Storage'));
  });

  const waitForAbort: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    if (init?.signal?.aborted) { reject(new Error('aborted')); return; }
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });

  test('cancels an in-flight request', async () => {
    const controller = new AbortController();
    const pending = new AuthClient(baseUrl, waitForAbort).login('student', 'secret', controller.signal);
    controller.abort();
    await assert.rejects(pending, hasCode('Cancelled'));
  });

  test('reports request timeout separately from cancellation', async () => {
    await assert.rejects(new AuthClient(baseUrl, waitForAbort, 5).login('student', 'secret'), hasCode('Timeout'));
  });
});
