import { ENGINE4Error } from 'engine4-node';
import { stripVTControlCharacters } from 'node:util';
import { ZodError } from 'zod';
import { ZodlineError } from 'zodline';

export const ExitCode = {
  Success: 0,
  Error: 1,
  Usage: 2,
  NotLoggedIn: 3,
} as const;

interface CliErrorOptions {
  code: string;
  message: string;
  exitCode: number;
  cause?: unknown;
}

export class CliError extends Error {
  public readonly code: string;
  public readonly exitCode: number;

  constructor({ code, message, exitCode, cause }: CliErrorOptions) {
    super(message, { cause });
    this.name = new.target.name;
    this.code = code;
    this.exitCode = exitCode;
  }
}

export class UsageError extends CliError {
  constructor(message: string, cause?: unknown) {
    super({ code: 'E_USAGE', message, exitCode: ExitCode.Usage, cause });
  }
}

export class NotLoggedInError extends CliError {
  constructor() {
    super({
      code: 'E_NOT_LOGGED_IN',
      message: 'Not logged in. Run "engine4 login" or set the ENGINE4_* environment variables.',
      exitCode: ExitCode.NotLoggedIn,
    });
  }
}

export class ConfirmationRequiredError extends CliError {
  constructor(message: string) {
    super({ code: 'E_CONFIRMATION_REQUIRED', message, exitCode: ExitCode.Error });
  }
}

export class ApiError extends CliError {
  constructor(error: ENGINE4Error) {
    super({
      code: 'E_API',
      message: `${error.message} (HTTP ${error.status})`,
      exitCode: error.status === 401 ? ExitCode.NotLoggedIn : ExitCode.Error,
      cause: error,
    });
  }
}

export class UnexpectedError extends CliError {
  constructor(cause: unknown) {
    super({
      code: 'E_UNEXPECTED',
      message: cause instanceof Error ? cause.message : String(cause),
      exitCode: ExitCode.Error,
      cause,
    });
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }
  if (error instanceof ENGINE4Error) {
    return new ApiError(error);
  }
  if (error instanceof ZodlineError) {
    return new UsageError(stripVTControlCharacters(error.message), error);
  }
  if (error instanceof ZodError) {
    return new UsageError(formatZodError(error), error);
  }
  return new UnexpectedError(error);
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const [key] = issue.path;
      return typeof key === 'string' ? `${toFlag(key)}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

function toFlag(optionKey: string): string {
  return `--${optionKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}
