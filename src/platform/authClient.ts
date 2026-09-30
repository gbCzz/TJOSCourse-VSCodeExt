import { PlatformError, toPlatformError } from './errors';

// 返回给上层的信息
export interface PlatformIdentity {
  username: string;
  displayName?: string;
  role?: string;
}

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
export class AuthClient {
  readonly baseUrl: string;
  private cookie?: SessionCookie;

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

  async login(username: string, password: string, signal?: AbortSignal): Promise<PlatformIdentity> {
    this.cookie = undefined;
    await this.request('api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }, signal);
    if (!this.cookie) {
      throw new PlatformError('Protocol', '平台未返回有效的 os_session 会话，无法确认登录。');
    }
    return this.getIdentity(signal);
  }

  async getIdentity(signal?: AbortSignal): Promise<PlatformIdentity> {
    const data = await this.request('api/auth/me', { method: 'GET' }, signal);
    if (typeof data.username !== 'string' || !data.username.trim()) {
      throw new PlatformError('Protocol', '平台身份响应缺少有效的 username。');
    }
    return {
      username: data.username,
      displayName: typeof data.display_name === 'string' ? data.display_name : undefined,
      role: typeof data.role === 'string' ? data.role : undefined,
    };
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

  private async request(
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
          throw new PlatformError('Protocol', '平台会话 Cookie 的路径不适用于身份接口。');
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
        throw new PlatformError('Protocol', '平台未返回 JSON，请检查平台地址或认证接口。');
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
              throw new PlatformError('Protocol', '平台认证响应超过大小限制。');
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
        throw new PlatformError('Protocol', '平台返回了未知的认证响应结构。');
      }
      const record = data as Record<string, unknown>;
      if (record.ok !== true) {
        throw new PlatformError(
          'Protocol',
          record.ok === false
            ? '平台未确认认证成功，请检查账号或在课程网站查看账号状态。'
            : '平台认证响应缺少 ok=true。',
        );
      }
      this.acceptCookies(response.headers, url);
      return record;
    } catch (error) {
      if (externalSignal?.aborted) {
        throw new PlatformError('Cancelled', '登录已取消。');
      }
      if (timedOut) {
        throw new PlatformError('Timeout', '平台请求超时，请稍后重新登录。');
      }
      throw toPlatformError(error);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', abort);
    }
  }
}

