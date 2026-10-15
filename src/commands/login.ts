import { ENGINE4, type AuthenticateOptions } from 'engine4-node';
import { z } from 'zod';
import { defineCommand } from 'zodline';
import { toExpiresAt } from '../utils/api-client';
import { writeConfig } from '../utils/config';
import type { InteractionOptions } from '../utils/environment';
import { defineCommandOptions } from '../utils/options';
import { printJson } from '../utils/output';
import { promptPassword, promptSelect, promptText } from '../utils/prompts';

type GrantType = 'password' | 'client_credentials';

const baseUrlSchema = z.url({ protocol: /^https?$/ });

interface LoginFlags extends InteractionOptions {
  username?: string;
  password?: string;
  clientSecret?: string;
}

export default defineCommand({
  description: 'Log in to an ENGINE4 server and store the credentials.',
  examples: [
    'engine4 login',
    'engine4 login --base-url https://prod.engine4.io --client-id my-client --client-secret my-secret --json',
  ],
  options: defineCommandOptions({
    baseUrl: baseUrlSchema.optional().describe('Base URL of the ENGINE4 server.'),
    clientId: z.string().min(1).optional().describe('Client ID.'),
    username: z.string().min(1).optional().describe('Username, for logging in as a user.'),
    password: z.string().min(1).optional().describe('Password, for logging in as a user.'),
    clientSecret: z
      .string()
      .min(1)
      .optional()
      .describe('Client secret, for logging in with client credentials.'),
  }),
  action: async (options) => {
    const baseUrl =
      options.baseUrl ?? baseUrlSchema.parse(await promptText('base-url', 'Base URL', options));
    const clientId = options.clientId ?? (await promptText('client-id', 'Client ID', options));
    const authenticateOptions = await resolveAuthenticateOptions(clientId, options);
    const { accessToken, expiresIn } = await new ENGINE4({ baseUrl }).authenticate(
      authenticateOptions,
    );
    writeConfig({
      baseUrl,
      ...authenticateOptions,
      accessToken,
      expiresAt: toExpiresAt(expiresIn),
    });
    if (options.json) {
      printJson({ baseUrl, clientId, grantType: toGrantType(authenticateOptions) });
    } else {
      process.stdout.write(`Logged in to ${baseUrl}\n`);
    }
  },
});

async function resolveAuthenticateOptions(
  clientId: string,
  flags: LoginFlags,
): Promise<AuthenticateOptions> {
  if (flags.clientSecret) {
    return { clientId, clientSecret: flags.clientSecret };
  }
  const grantType =
    flags.username || flags.password
      ? 'password'
      : await promptSelect<GrantType>(
          'client-secret',
          'How do you want to log in?',
          [
            { value: 'password', label: 'Username and password' },
            { value: 'client_credentials', label: 'Client secret' },
          ],
          flags,
        );
  if (grantType === 'client_credentials') {
    return {
      clientId,
      clientSecret: await promptPassword('client-secret', 'Client secret', flags),
    };
  }
  return {
    clientId,
    username: flags.username ?? (await promptText('username', 'Username', flags)),
    password: flags.password ?? (await promptPassword('password', 'Password', flags)),
  };
}

function toGrantType(authenticateOptions: AuthenticateOptions): GrantType {
  return 'clientSecret' in authenticateOptions ? 'client_credentials' : 'password';
}
