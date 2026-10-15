import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../src/cli';
import { getConfigFilePath, readConfig, writeConfig } from '../src/utils/config';
import {
  BASE_URL,
  captureOutput,
  engine4ErrorResponse,
  mockFetchRoutes,
  tokenResponse,
  useTempConfigDir,
} from './helpers';

describe('runCli', () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    useTempConfigDir();
    output = captureOutput();
  });

  it('returns 2 for an unknown command', async () => {
    expect(await runCli(['nope'])).toBe(2);
    expect(output.stdout()).toContain('USAGE engine4 <command>');
    expect(output.stderr()).toBe('E_USAGE Unknown command: nope\n');
  });

  it('returns 2 for an unknown option', async () => {
    expect(await runCli(['logout', '--nope'])).toBe(2);
    expect(output.stderr()).toBe('E_USAGE Unknown option: --nope\n');
  });

  describe('login', () => {
    it('verifies the credentials and stores them', async () => {
      const fetchMock = mockFetchRoutes({ '/token': tokenResponse('new-token') });

      const exitCode = await runCli([
        'login',
        '--base-url',
        BASE_URL,
        '--client-id',
        'client',
        '--username',
        'user',
        '--password',
        'pass',
        '--json',
      ]);

      expect(exitCode).toBe(0);
      expect(JSON.parse(output.stdout())).toEqual({
        baseUrl: BASE_URL,
        clientId: 'client',
        grantType: 'password',
      });
      const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('password');
      expect(body.get('username')).toBe('user');
      expect(readConfig()).toMatchObject({
        baseUrl: BASE_URL,
        clientId: 'client',
        username: 'user',
        password: 'pass',
        accessToken: 'new-token',
      });
    });

    it('names the missing flag when it cannot prompt', async () => {
      expect(await runCli(['login', '--base-url', BASE_URL, '--json'])).toBe(2);
      expect(output.stderr()).toBe('E_USAGE Missing --client-id.\n');
    });

    it('stores nothing when the server rejects the credentials', async () => {
      mockFetchRoutes({ '/token': engine4ErrorResponse(400, 'invalid_grant') });

      const exitCode = await runCli([
        'login',
        '--base-url',
        BASE_URL,
        '--client-id',
        'client',
        '--client-secret',
        'wrong',
      ]);

      expect(exitCode).toBe(1);
      expect(output.stderr()).toBe('E_API invalid_grant (HTTP 400)\n');
      expect(existsSync(getConfigFilePath())).toBe(false);
    });
  });

  describe('logout', () => {
    it('deletes the stored credentials', async () => {
      writeConfig({ baseUrl: BASE_URL, clientId: 'client', clientSecret: 'secret' });

      expect(await runCli(['logout', '--json'])).toBe(0);

      expect(JSON.parse(output.stdout())).toEqual({ wasLoggedIn: true });
      expect(existsSync(getConfigFilePath())).toBe(false);
    });
  });
});
