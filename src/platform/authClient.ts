import { PlatformError } from './errors';
import { PlatformClient } from './platformClient';

// 保留现有导出，调用方无需调整导入路径
export { SessionCookie, normalizeBaseUrl } from './platformClient';

// 返回给上层的信息
export interface PlatformIdentity {
  username: string;
  displayName?: string;
  role?: string;
}

export class AuthClient extends PlatformClient {
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
}
