import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../src/utils/api-client';
import { readConfig, writeConfig } from '../src/utils/config';
import { BASE_URL, mockFetchRoutes, tokenResponse, useTempConfigDir } from './helpers';

const LOGIN = { baseUrl: BASE_URL, clientId: 'client', clientSecret: 'secret' };

describe('createApiClient', () => {
  beforeEach(() => {
    useTempConfigDir();
  });

  it('reuses a cached token that is not expired', async () => {
    const fetchMock = mockFetchRoutes({});
    writeConfig({ ...LOGIN, accessToken: 'cached', expiresAt: inMinutes(10) });

    const { accessToken } = await createApiClient();

    expect(accessToken).toBe('cached');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authenticates again when the cached token is about to expire and caches the new one', async () => {
    const fetchMock = mockFetchRoutes({ '/token': tokenResponse('fresh', 3600) });
    writeConfig({ ...LOGIN, accessToken: 'cached', expiresAt: inMinutes(0.5) });

    const { accessToken } = await createApiClient();

    expect(accessToken).toBe('fresh');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(readConfig()).toMatchObject({ ...LOGIN, accessToken: 'fresh' });
    expect(Date.parse(readConfig()!.expiresAt!)).toBeGreaterThan(Date.now() + 3500_000);
  });

  it('authenticates with environment credentials without writing a config', async () => {
    mockFetchRoutes({ '/token': tokenResponse('env-token') });
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_CLIENT_ID', 'client');
    vi.stubEnv('ENGINE4_CLIENT_SECRET', 'secret');

    const { accessToken } = await createApiClient();

    expect(accessToken).toBe('env-token');
    expect(readConfig()).toBeUndefined();
  });
});

function inMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
