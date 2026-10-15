import { statSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteConfig,
  getConfigFilePath,
  readConfig,
  writeConfig,
  type UserConfig,
} from '../src/utils/config';
import { BASE_URL, useTempConfigDir } from './helpers';

const CONFIG: UserConfig = {
  baseUrl: BASE_URL,
  clientId: 'test-client',
  clientSecret: 'test-secret',
  accessToken: 'test-token',
  expiresAt: '2030-01-01T00:00:00.000Z',
};

describe('config', () => {
  let configDirectory: string;

  beforeEach(() => {
    configDirectory = useTempConfigDir();
  });

  it('stores the file in the XDG config directory', () => {
    expect(getConfigFilePath()).toBe(`${configDirectory}/engine4/config.json`);
  });

  it('returns undefined without a config file', () => {
    expect(readConfig()).toBeUndefined();
  });

  it('reads what was written', () => {
    writeConfig(CONFIG);
    expect(readConfig()).toEqual(CONFIG);
  });

  it.skipIf(process.platform === 'win32')('writes the file readable by its owner only', () => {
    writeConfig(CONFIG);
    expect(statSync(getConfigFilePath()).mode & 0o777).toBe(0o600);
  });

  it('deletes the file', () => {
    writeConfig(CONFIG);
    expect(deleteConfig()).toBe(true);
    expect(readConfig()).toBeUndefined();
    expect(deleteConfig()).toBe(false);
  });
});
