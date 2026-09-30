import { AuthClient, PlatformIdentity, normalizeBaseUrl } from './authClient';
import { PlatformError } from './errors';

/**
 * 接口 SecretStore 需要一个类的对象，该类有用于存储的方法 \
 * 一个对象匹配该接口，当且仅当这个对象具有一个异步的，接受一对键值对的，名为 store 的方法 \
 * 以此，可以避免认证流程依赖 vscode 宿主
 */
export interface SecretStore {
  store(key: string, value: string): PromiseLike<void>;
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
  ) {}

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
    return identity;
  }
}

