import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeConfig } from '../src/utils/config';
import { resolveCredentials } from '../src/utils/credentials';
import { NotLoggedInError, UsageError } from '../src/utils/errors';
import { BASE_URL, useTempConfigDir } from './helpers';

describe('resolveCredentials', () => {
  beforeEach(() => {
    useTempConfigDir();
  });

  it('throws NotLoggedInError without environment variables and config', () => {
    expect(() => resolveCredentials()).toThrow(NotLoggedInError);
  });

  it('uses the config written by login', () => {
    writeConfig({ baseUrl: BASE_URL, clientId: 'client', username: 'user', password: 'pass' });
    expect(resolveCredentials()).toMatchObject({
      type: 'config',
      baseUrl: BASE_URL,
      authenticateOptions: { clientId: 'client', username: 'user', password: 'pass' },
    });
  });

  it('prefers environment variables over the config', () => {
    writeConfig({ baseUrl: 'https://config.engine4.io', clientId: 'config', clientSecret: 'x' });
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_CLIENT_ID', 'env-client');
    vi.stubEnv('ENGINE4_CLIENT_SECRET', 'env-secret');
    expect(resolveCredentials()).toEqual({
      type: 'environment',
      baseUrl: BASE_URL,
      authenticateOptions: { clientId: 'env-client', clientSecret: 'env-secret' },
    });
  });

  it('uses ENGINE4_ACCESS_TOKEN without authenticating', () => {
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_ACCESS_TOKEN', 'env-token');
    expect(resolveCredentials()).toEqual({
      type: 'accessToken',
      baseUrl: BASE_URL,
      accessToken: 'env-token',
    });
  });

  it('names the missing variables of a partial environment', () => {
    vi.stubEnv('ENGINE4_BASE_URL', BASE_URL);
    vi.stubEnv('ENGINE4_USERNAME', 'user');
    expect(() => resolveCredentials()).toThrow(
      new UsageError('Missing environment variables: ENGINE4_CLIENT_ID, ENGINE4_PASSWORD.'),
    );
  });
});
