export type PlatformErrorCode = 'Configuration' | 'Unauthorized' | 'Forbidden' | 'Server'
  | 'Protocol' | 'Network' | 'Timeout' | 'Cancelled' | 'Storage';

// Only fixed, credential-free messages may reach the UI or OutputChannel.
export class PlatformError extends Error {
  constructor(public readonly code: PlatformErrorCode, message: string, public readonly status?: number) {
    super(message);
    this.name = 'PlatformError';
  }
}

export function toPlatformError(error: unknown): PlatformError {
  return error instanceof PlatformError ? error
    : new PlatformError('Network', '无法连接课程平台，请检查网络、平台地址及证书。');
}
