import { AuthClient, PlatformIdentity, SessionCookie, normalizeBaseUrl } from './authClient';
import { PlatformError } from './errors';

/**
 * 接口 SecretStore 需要一个类的对象，该类有用于存储的方法 \
 * 一个对象匹配该接口，当且仅当这个对象具有一个异步的，接受一对键值对的，名为 store 的方法 \
 * 以此，可以避免认证流程依赖 vscode 宿主
 */
export interface SecretStore {
  store(key: string, value: string): PromiseLike<void>;
  get(key: string): PromiseLike<string | undefined>;
  delete(key: string): PromiseLike<void>;
}

/**
 * 接口 AuthState 规定了一类登录状态 \
 * 需要提供一个已创建的客户端对象，标明请求基址和身份认证信息
 */
export interface AuthState {
  readonly client: AuthClient;
  readonly baseUrl: string;
  readonly identity: PlatformIdentity;
}

/**
 * 认证服务类
 * @property secrets 提供存储功能的对象
 * @property creatClient 一个通过 URL 创建 AuthClient 的方法，使得认证客户端可以自定义，不依赖真实平台
 */
export class AuthService {
  constructor(
    private readonly secrets: SecretStore,
    private readonly createClient = (baseUrl: string) => new AuthClient(baseUrl),
    private currentState?: AuthState,
  ) {}

  private async deleteSavedSession(key: string): Promise<void> {
    try {
      await this.secrets.delete(key);
    } catch {
      throw new PlatformError('Storage', '无法清除失效会话，请检查系统凭据存储后重试。');
    }
  }

  private async getSecrets(key: string): Promise<string | undefined> {
    try {
      return await this.secrets.get(key);
    } catch {
      throw new PlatformError('Storage', `从 Secrets 读取 ${key} 字段时失败`);
    }
  }

  get current() {
    return this.currentState;
  }

  clearCurrent() {
    this.currentState = undefined;
  }

  /**
   * 平台登录方法
   * @param baseUrl 请求基址
   * @param username 登录用户名
   * @param password 登录密码
   * @param signal 外层传入的主动取消信号
   * @returns 平台身份信息
   */
  async login(baseUrl: string, username: string, password: string, signal?: AbortSignal): Promise<PlatformIdentity> {
    // 基址规范化
    const normalizedUrl = normalizeBaseUrl(baseUrl);

    // 创建客户端
    const client = this.createClient(normalizedUrl);

    // 登录、获取用户认证信息
    const identity = await client.login(username, password, signal);

    // 保存认证凭证
    const session = client.session;

    // 检查会话是否可用
    if (!session) {
      throw new PlatformError('Unauthorized', '身份核验后会话已失效，请重新登录。');
    }

    // 检查用户是否主动取消
    if (signal?.aborted) {
      throw new PlatformError('Cancelled', '登录已取消。');
    }

    try {
      // 按照平台基址存储会话，保存会话：
      // 平台、登录凭证、平台核验后的用户名
      await this.secrets.store(
        `tongjios.session:${normalizedUrl}`,
        JSON.stringify({
          version: 1,
          baseUrl: normalizedUrl,
          session,
          username: identity.username,
        }),
      );
    } catch {
      throw new PlatformError('Storage', '平台身份核验成功，但无法安全保存会话，请检查系统凭据存储后重试。');
    }

    this.currentState = {
      client,
      baseUrl: normalizedUrl,
      identity,
    };

    return identity;
  }

  /**
   * 从先前保存的会话 Cookie 恢复验证状态
   * @param baseUrl 请求基址
   * @param signal 外层传入的主动取消信号
   */
  async restore(baseUrl: string, signal?: AbortSignal): Promise<PlatformIdentity | undefined> {
    // 基址规范化
    const normalizedUrl = normalizeBaseUrl(baseUrl);

    // vscode 插件内部以如下键值对保存，raw 是 Stringified JSON
    const key = `tongjios.session:${normalizedUrl}`;
    const raw = await this.getSecrets(key);

    if (raw === undefined || raw === null || raw.trim() === 'null') {
      return undefined;
    }

    const session = ((): SessionCookie | undefined => {
      try {
        return JSON.parse(raw).session;
      } catch {
        return undefined;
      }
    })();

    if (session === undefined) {
      await this.deleteSavedSession(key);
      return undefined;
    }

    const client = this.createClient(normalizedUrl);
    try {
      client.restoreSession(session);
    } catch {
      await this.deleteSavedSession(key);
      return undefined;
    }

    // 当出现未授权时，赋值 identity 为 undefined
    const identity = await (async (): Promise<PlatformIdentity | undefined> => {
      try {
        return await client.getIdentity(signal);
      } catch (error) {
        if (error instanceof PlatformError && error.code === 'Unauthorized') {
          await this.deleteSavedSession(key);
          return undefined;
        }

        throw error;
      }
    })();

    if (identity === undefined) {
      return undefined;
    }

    const newSession = client.session;

    if (!newSession) {
      await this.deleteSavedSession(key);
      return undefined;
    }

    // 检查用户是否主动取消
    if (signal?.aborted) {
      throw new PlatformError('Cancelled', '登录已取消。');
    }

    try {
      // 按照平台基址存储会话，保存会话：
      // 平台、登录凭证、平台核验后的用户名
      await this.secrets.store(
        `tongjios.session:${normalizedUrl}`,
        JSON.stringify({
          version: 1,
          baseUrl: normalizedUrl,
          session: newSession,
          username: identity.username,
        }),
      );
    } catch {
      throw new PlatformError('Storage', '平台身份核验成功，但无法安全保存会话，请检查系统凭据存储后重试。');
    }

    this.currentState = {
      client,
      baseUrl: normalizedUrl,
      identity,
    };

    return identity;
  }
}

