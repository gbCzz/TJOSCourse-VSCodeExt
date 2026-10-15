import * as vscode from 'vscode';
import { normalizeBaseUrl } from './platform/authClient';

const DEFAULT_PLATFORM_URL = 'https://vesper-center.gardilily.com';

export function getPlatformBaseUrl(): string {
  const configuredUrl = vscode.workspace
    .getConfiguration('tongjios')
    .get<string>('platformUrl', '');

  return normalizeBaseUrl(configuredUrl.trim() || DEFAULT_PLATFORM_URL);
}