import type { AuthenticateOptions } from 'engine4-node';
import { readConfig, type UserConfig } from './config';
import { NotLoggedInError, UsageError } from './errors';

export type Credentials =
  | { type: 'accessToken'; baseUrl: string; accessToken: string }
  | { type: 'environment'; baseUrl: string; authenticateOptions: AuthenticateOptions }
  | {
      type: 'config';
      baseUrl: string;
      authenticateOptions: AuthenticateOptions;
      config: UserConfig;
    };

type Env = Record<string, string | undefined>;

const ENV_VAR_NAMES = [
  'ENGINE4_BASE_URL',
  'ENGINE4_ACCESS_TOKEN',
  'ENGINE4_CLIENT_ID',
  'ENGINE4_CLIENT_SECRET',
  'ENGINE4_USERNAME',
  'ENGINE4_PASSWORD',
] as const;

/**
 * Any `ENGINE4_*` environment variable wins over the config file written by `engine4 login`.
 */
export function resolveCredentials(env: Env = process.env): Credentials {
  if (ENV_VAR_NAMES.some((name) => env[name])) {
    return resolveEnvCredentials(env);
  }
  const config = readConfig();
  if (!config) {
    throw new NotLoggedInError();
  }
  return {
    type: 'config',
    baseUrl: config.baseUrl,
    authenticateOptions: toAuthenticateOptions(config),
    config,
  };
}

function toAuthenticateOptions(config: UserConfig): AuthenticateOptions {
  return 'clientSecret' in config
    ? { clientId: config.clientId, clientSecret: config.clientSecret }
    : { clientId: config.clientId, username: config.username, password: config.password };
}

function resolveEnvCredentials(env: Env): Credentials {
  if (env.ENGINE4_ACCESS_TOKEN) {
    assertEnvVarsSet(env, ['ENGINE4_BASE_URL']);
    return {
      type: 'accessToken',
      baseUrl: env.ENGINE4_BASE_URL!,
      accessToken: env.ENGINE4_ACCESS_TOKEN,
    };
  }
  const grantVarNames = env.ENGINE4_CLIENT_SECRET ? [] : ['ENGINE4_USERNAME', 'ENGINE4_PASSWORD'];
  assertEnvVarsSet(env, ['ENGINE4_BASE_URL', 'ENGINE4_CLIENT_ID', ...grantVarNames]);
  const clientId = env.ENGINE4_CLIENT_ID!;
  return {
    type: 'environment',
    baseUrl: env.ENGINE4_BASE_URL!,
    authenticateOptions: env.ENGINE4_CLIENT_SECRET
      ? { clientId, clientSecret: env.ENGINE4_CLIENT_SECRET }
      : { clientId, username: env.ENGINE4_USERNAME!, password: env.ENGINE4_PASSWORD! },
  };
}

function assertEnvVarsSet(env: Env, names: string[]): void {
  const missingNames = names.filter((name) => !env[name]);
  if (missingNames.length > 0) {
    throw new UsageError(`Missing environment variables: ${missingNames.join(', ')}.`);
  }
}
