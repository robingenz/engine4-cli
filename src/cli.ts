import { stripVTControlCharacters } from 'node:util';
import { defineConfig, processConfig } from 'zodline';
import packageJson from '../package.json' with { type: 'json' };
import { commands } from './commands';
import { isColorEnabled } from './utils/environment';
import { ExitCode, toCliError } from './utils/errors';
import { printError } from './utils/output';

const config = defineConfig({
  meta: {
    name: 'engine4',
    version: packageJson.version,
    description: packageJson.description,
  },
  commands,
});

/**
 * Runs one command line and returns its exit code.
 * Commands throw on failure; this is the one place that prints the error and picks the exit code.
 */
export async function runCli(argv: string[]): Promise<number> {
  try {
    const { command, options, args } = parseCommandLine(expandShortFlags(argv));
    await command.action(options, args);
    return ExitCode.Success;
  } catch (error) {
    const cliError = toCliError(error);
    printError(cliError);
    return cliError.exitCode;
  }
}

/**
 * zodline has no `-h` and `-v`. `-v` only means `--version` in front, where zodline handles `--version`.
 */
function expandShortFlags(argv: string[]): string[] {
  return argv.map((arg, index) => {
    if (arg === '-h') {
      return '--help';
    }
    if (arg === '-v' && index === 0) {
      return '--version';
    }
    return arg;
  });
}

/**
 * zodline always colors its help, so the color codes are stripped when stdout shows no color.
 */
function parseCommandLine(argv: string[]) {
  if (isColorEnabled(process.stdout)) {
    return processConfig(config, argv);
  }
  const log = console.log;
  console.log = (...values: unknown[]) =>
    log(
      ...values.map((value) =>
        typeof value === 'string' ? stripVTControlCharacters(value) : value,
      ),
    );
  try {
    return processConfig(config, argv);
  } finally {
    console.log = log;
  }
}
