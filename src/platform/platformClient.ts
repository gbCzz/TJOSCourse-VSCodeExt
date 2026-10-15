import { PlatformError, toPlatformError } from './errors';

export interface SessionCookie {
  /** Session 具体值 */
  value: string;
  /** Cookie 生效的路径 */
  path: string;
  /** Cookie 过期时间 */
  expiresAt?: number;
}

export function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error();
    }
    url.pathname = url.pathname.replace(/\/+$/, '') + '/';
    return url.href;
  } catch {
    throw new PlatformError(
      'Configuration',
      '请将 tongjios.platformUrl 设置为 HTTPS 平台地址（不含账号、查询参数或片段）。',
    );
  }
}

function matchesPath(path: string, cookiePath: string): boolean {
  return (
    path === cookiePath ||
    (path.startsWith(cookiePath) && (cookiePath.endsWith('/') || path[cookiePath.length] === '/'))
  );
}

/** Minimal jar for the observed os_session cookie, bound to one platform URL. */
export class PlatformClient {
  readonly baseUrl: string;
  protected cookie?: SessionCookie;

  constructor(
    baseUrl: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 15_000,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  get session(): SessionCookie | undefined {
    return this.cookie && { ...this.cookie };
  }

  restoreSession(session: SessionCookie) {
    const { value, path, expiresAt } = session;

    // 检验 Cookie 值规则
    if (typeof value !== 'string' || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/.test(value)) {
      throw new PlatformError('Protocol', '保存的 Cookie 无效');
    }

    // 检查平台身份接口是否匹配
    const identityPath = new URL('api/auth/me', this.baseUrl).pathname;

    if (typeof path !== 'string' || !path.startsWith('/') || !matchesPath(identityPath, path)) {
      throw new PlatformError('Protocol', '保存的 Cookie 不适用于该平台');
    }

    // 检查是否过期
    if (expiresAt !== undefined) {
      if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
        throw new PlatformError('Protocol', '保存的过期时间无效');
      }

      if (expiresAt <= Date.now()) {
        throw new PlatformError('Unauthorized', '保存的会话已过期');
      }
    }

    this.cookie = { value, path, expiresAt };
  }

  private acceptCookies(headers: Headers, url: URL) {
    for (const header of headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';').map((part) => part.trim());
      const separator = pair.indexOf('=');
      if (pair.slice(0, separator) !== 'os_session') {
        continue;
      }
      const value = pair.slice(separator + 1);
      const attrs = new Map(
        attributes.map((attribute) => {
          const index = attribute.indexOf('=');
          return index < 0
            ? [attribute.toLowerCase(), '']
            : [attribute.slice(0, index).toLowerCase(), attribute.slice(index + 1)];
        }),
      );
      const domain = attrs.get('domain')?.replace(/^\./, '').toLowerCase();
      // Narrow domain cookies to this origin; never send the session to other hosts.
      if (domain && url.hostname !== domain && !url.hostname.endsWith(`.${domain}`)) {
        throw new PlatformError('Protocol', '平台返回了不匹配的会话 Cookie 域名。');
      }
      const defaultPath = url.pathname.slice(0, url.pathname.lastIndexOf('/')) || '/';
      const path = attrs.get('path')?.startsWith('/') ? attrs.get('path')! : defaultPath;
      const maxAge = attrs.get('max-age');
      const expires = Date.parse(attrs.get('expires') ?? '');
      const expiresAt =
        maxAge !== undefined && /^-?\d+$/.test(maxAge)
          ? Date.now() + Number(maxAge) * 1000
          : Number.isFinite(expires)
            ? expires
            : undefined;
      if (!value || (expiresAt !== undefined && expiresAt <= Date.now())) {
        this.cookie = undefined;
      } else if (/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/.test(value)) {
        this.cookie = { value, path, expiresAt };
      } else {
        throw new PlatformError('Protocol', '平台返回了无效的会话 Cookie。');
      }
    }
  }

  /** 请求当前平台的 JSON 接口，复用客户端持有的会话。 */
  async request(
    path: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    externalSignal?.addEventListener('abort', abort, { once: true });
    if (externalSignal?.aborted) {
      controller.abort();
    }
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    try {
      const url = new URL(path, this.baseUrl);
      if (url.origin !== new URL(this.baseUrl).origin || url.username || url.password) {
        throw new PlatformError('Configuration', '请求地址必须属于当前平台，且不能包含账号信息。');
      }
      const headers = new Headers({ Accept: 'application/json' });
      if (init.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (this.cookie) {
        if (this.cookie.expiresAt !== undefined && this.cookie.expiresAt <= Date.now()) {
          this.cookie = undefined;
          throw new PlatformError('Unauthorized', '会话已过期，请重新登录。');
        }
        if (!matchesPath(url.pathname, this.cookie.path)) {
          throw new PlatformError('Protocol', '平台会话 Cookie 的路径不适用于请求接口。');
        }
        headers.set('Cookie', `os_session=${this.cookie.value}`);
      }
      const response = await this.fetcher(url, { ...init, headers, signal: controller.signal, redirect: 'manual' });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401) {
          this.cookie = undefined;
          throw new PlatformError('Unauthorized', '账号密码错误或会话已失效，请重新登录。', 401);
        }
        if (response.status === 403) {
          throw new PlatformError('Forbidden', '平台拒绝访问，请检查账号权限。', 403);
        }
        throw new PlatformError(
          response.status >= 500 ? 'Server' : 'Protocol',
          `平台请求失败（HTTP ${response.status}），请检查平台地址或稍后重试。`,
          response.status,
        );
      }
      if (!/^application\/(?:[\w.-]+\+)?json\b/i.test(response.headers.get('content-type') ?? '')) {
        await response.body?.cancel();
        throw new PlatformError('Protocol', '平台未返回 JSON，请检查平台地址或请求接口。');
      }
      // Bound the decoded body, including chunked responses.
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader) {
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) {
              break;
            }
            length += chunk.value.byteLength;
            if (length > 1024 * 1024) {
              await reader.cancel();
              throw new PlatformError('Protocol', '平台响应超过大小限制。');
            }
            chunks.push(chunk.value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      let data: unknown;
      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new PlatformError('Protocol', '平台返回了无效的 JSON。');
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new PlatformError('Protocol', '平台返回了未知的响应结构。');
      }
      const record = data as Record<string, unknown>;
      if (record.ok !== true) {
        throw new PlatformError(
          'Protocol',
          record.ok === false
            ? '平台未确认请求成功，请在课程网站查看相关状态。'
            : '平台响应缺少 ok=true。',
        );
      }
      this.acceptCookies(response.headers, url);
      return record;
    } catch (error) {
      if (externalSignal?.aborted) {
        throw new PlatformError('Cancelled', '请求已取消。');
      }
      if (timedOut) {
        throw new PlatformError('Timeout', '平台请求超时，请稍后重试。');
      }
      throw toPlatformError(error);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', abort);
    }
  }
}

