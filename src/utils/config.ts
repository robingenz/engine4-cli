import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { CliError, ExitCode } from './errors';

const loginSchema = z.union([
  z.object({ clientId: z.string(), clientSecret: z.string() }),
  z.object({ clientId: z.string(), username: z.string(), password: z.string() }),
]);

const userConfigSchema = z
  .object({
    baseUrl: z.string(),
    accessToken: z.string().optional(),
    expiresAt: z.iso.datetime().optional(),
  })
  .and(loginSchema);

export type UserConfig = z.infer<typeof userConfigSchema>;

/**
 * `$XDG_CONFIG_HOME/engine4/config.json` (default `~/.config`), or `%APPDATA%\engine4\config.json` on Windows.
 */
export function getConfigFilePath(): string {
  const baseDirectory =
    process.platform === 'win32'
      ? (process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'))
      : process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(baseDirectory, 'engine4', 'config.json');
}

export function readConfig(): UserConfig | undefined {
  const filePath = getConfigFilePath();
  if (!existsSync(filePath)) {
    return undefined;
  }
  try {
    return userConfigSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  } catch (error) {
    throw new CliError({
      code: 'E_INVALID_CONFIG',
      message: `${filePath} is invalid. Run "engine4 login" again.`,
      exitCode: ExitCode.Error,
      cause: error,
    });
  }
}

/**
 * The file holds credentials, so only its owner may read it.
 * The mode covers a new file, `chmod` an existing one.
 */
export function writeConfig(config: UserConfig): void {
  const filePath = getConfigFilePath();
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  chmodSync(filePath, 0o600);
}

/**
 * Returns whether there was a config file to delete.
 */
export function deleteConfig(): boolean {
  const filePath = getConfigFilePath();
  if (!existsSync(filePath)) {
    return false;
  }
  rmSync(filePath);
  return true;
}
