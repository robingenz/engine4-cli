import { ENGINE4Error } from 'engine4-node';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodlineError } from 'zodline';
import { CliError, NotLoggedInError, toCliError } from '../src/utils/errors';

describe('toCliError', () => {
  it('keeps CLI errors as they are', () => {
    const error = new NotLoggedInError();
    expect(toCliError(error)).toBe(error);
  });

  it('maps zodline errors to usage errors without color codes', () => {
    const cliError = toCliError(new ZodlineError('Unknown option: \x1b[36m--nope\x1b[0m'));
    expect(cliError).toMatchObject({
      code: 'E_USAGE',
      exitCode: 2,
      message: 'Unknown option: --nope',
    });
  });

  it('maps option validation errors to usage errors naming the flag', () => {
    const result = z.object({ baseUrl: z.url() }).safeParse({ baseUrl: 'nope' });
    const cliError = toCliError(result.error);
    expect(cliError.code).toBe('E_USAGE');
    expect(cliError.exitCode).toBe(2);
    expect(cliError.message).toMatch(/^--base-url: /);
  });

  it('maps a 401 API error to exit code 3', () => {
    const cliError = toCliError(
      new ENGINE4Error(401, 'Unauthorized', { message: 'Invalid token' }),
    );
    expect(cliError).toMatchObject({
      code: 'E_API',
      exitCode: 3,
      message: 'Invalid token (HTTP 401)',
    });
  });

  it('maps other API errors to exit code 1', () => {
    const cliError = toCliError(new ENGINE4Error(500, 'Internal Server Error', undefined));
    expect(cliError).toMatchObject({ code: 'E_API', exitCode: 1 });
  });

  it('maps anything else to an unexpected error', () => {
    const cliError = toCliError(new Error('boom'));
    expect(cliError).toBeInstanceOf(CliError);
    expect(cliError).toMatchObject({ code: 'E_UNEXPECTED', exitCode: 1, message: 'boom' });
  });
});
