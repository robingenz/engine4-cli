import { confirm, isCancel, password, select, text, type Option } from '@clack/prompts';
import { isInteractive, type InteractionOptions } from './environment';
import { ConfirmationRequiredError, UsageError } from './errors';

/**
 * Asks for the value of a flag the command line left out. Without a person to ask, fails naming the flag.
 */
export async function promptText(
  flag: string,
  message: string,
  options: InteractionOptions,
): Promise<string> {
  assertInteractive(flag, options);
  const answer = await text({ message, validate: requireValue, output: process.stderr });
  assertAnswered(flag, answer);
  return answer;
}

/**
 * Like `promptText`, but hides what is typed.
 */
export async function promptPassword(
  flag: string,
  message: string,
  options: InteractionOptions,
): Promise<string> {
  assertInteractive(flag, options);
  const answer = await password({ message, validate: requireValue, output: process.stderr });
  assertAnswered(flag, answer);
  return answer;
}

export async function promptSelect<Value extends string>(
  flag: string,
  message: string,
  choices: Option<Value>[],
  options: InteractionOptions,
): Promise<Value> {
  assertInteractive(flag, options);
  const answer = await select({ message, options: choices, output: process.stderr });
  assertAnswered(flag, answer);
  return answer;
}

/**
 * Asks before something that cannot be undone. `--yes` confirms without asking.
 * Throws when nobody can confirm or the person declines.
 */
export async function requireConfirmation(
  message: string,
  options: InteractionOptions,
): Promise<void> {
  if (options.yes) {
    return;
  }
  if (!isInteractive(options)) {
    throw new ConfirmationRequiredError(`${message} Pass --yes to confirm.`);
  }
  const answer = await confirm({ message, initialValue: false, output: process.stderr });
  if (answer !== true) {
    throw new ConfirmationRequiredError('Cancelled.');
  }
}

function assertInteractive(flag: string, options: InteractionOptions): void {
  if (!isInteractive(options)) {
    throw new UsageError(`Missing --${flag}.`);
  }
}

function assertAnswered<Answer>(
  flag: string,
  answer: Answer,
): asserts answer is Exclude<Answer, symbol> {
  if (isCancel(answer)) {
    throw new UsageError(`Missing --${flag}.`);
  }
}

function requireValue(value: string | undefined): string | undefined {
  return value?.trim() ? undefined : 'Enter a value.';
}
