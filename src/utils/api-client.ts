import { ENGINE4 } from 'engine4-node';
import { writeConfig } from './config';
import { resolveCredentials, type Credentials } from './credentials';

export interface ApiClient {
  client: ENGINE4;
  accessToken: string;
}

const TOKEN_EXPIRY_MARGIN_MS = 60_000;

/**
 * A client with a usable access token. Credentials from `engine4 login` reuse the cached token until
 * shortly before it expires, then authenticate again and cache the new token.
 */
export async function createApiClient(): Promise<ApiClient> {
  const credentials = resolveCredentials();
  const client = new ENGINE4({ baseUrl: credentials.baseUrl });
  switch (credentials.type) {
    case 'accessToken':
      return { client, accessToken: credentials.accessToken };
    case 'environment':
      return {
        client,
        accessToken: (await client.authenticate(credentials.authenticateOptions)).accessToken,
      };
    case 'config':
      return { client, accessToken: await getCachedOrNewAccessToken(client, credentials) };
  }
}

/**
 * The ISO timestamp at which a token that lives `expiresInSeconds` from now expires.
 */
export function toExpiresAt(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

async function getCachedOrNewAccessToken(
  client: ENGINE4,
  { authenticateOptions, config }: Extract<Credentials, { type: 'config' }>,
): Promise<string> {
  if (config.accessToken && isTokenValid(config.expiresAt)) {
    return config.accessToken;
  }
  const { accessToken, expiresIn } = await client.authenticate(authenticateOptions);
  writeConfig({ ...config, accessToken, expiresAt: toExpiresAt(expiresIn) });
  return accessToken;
}

function isTokenValid(expiresAt: string | undefined): boolean {
  return expiresAt !== undefined && Date.parse(expiresAt) - TOKEN_EXPIRY_MARGIN_MS > Date.now();
}
