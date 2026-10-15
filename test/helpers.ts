import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';

export const BASE_URL = 'https://test.engine4.io';

const ENGINE4_ENV_VAR_NAMES = [
  'ENGINE4_BASE_URL',
  'ENGINE4_ACCESS_TOKEN',
  'ENGINE4_CLIENT_ID',
  'ENGINE4_CLIENT_SECRET',
  'ENGINE4_USERNAME',
  'ENGINE4_PASSWORD',
];

/**
 * Replaces the global `fetch` with a mock that answers ENGINE4 requests by pathname.
 * Plain values are returned as JSON with status 200, `Response` instances as they are.
 */
export function mockFetchRoutes(routes: Record<string, unknown>) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const { pathname } = new URL(String(input));
    if (!(pathname in routes)) {
      return new Response(null, { status: 404, statusText: 'Not Found' });
    }
    const route = routes[pathname];
    return route instanceof Response ? route.clone() : Response.json(route);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function engine4ErrorResponse(status: number, message = 'Error'): Response {
  return Response.json({ message }, { status });
}

export function tokenResponse(accessToken: string, expiresIn = 3600) {
  return { access_token: accessToken, expires_in: expiresIn, token_type: 'Bearer', scope: '' };
}

/**
 * Points the config file to a fresh temporary directory and clears the `ENGINE4_*` variables of the machine.
 * Call it in `beforeEach`; vitest restores the environment after each test.
 */
export function useTempConfigDir(): string {
  const directory = mkdtempSync(join(tmpdir(), 'engine4-cli-test-'));
  vi.stubEnv('XDG_CONFIG_HOME', directory);
  for (const name of ENGINE4_ENV_VAR_NAMES) {
    vi.stubEnv(name, undefined);
  }
  return directory;
}

/**
 * Collects everything written to stdout and stderr instead of printing it.
 * zodline prints its help with `console.log`, which vitest intercepts before it reaches stdout.
 */
export function captureOutput() {
  let stdout = '';
  let stderr = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout += String(chunk);
    return true;
  });
  vi.spyOn(console, 'log').mockImplementation((...values: unknown[]) => {
    stdout += `${values.join(' ')}\n`;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderr += String(chunk);
    return true;
  });
  return {
    stdout: () => stdout,
    stderr: () => stderr,
  };
}
