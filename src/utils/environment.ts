export interface InteractionOptions {
  json: boolean;
  yes?: boolean;
}

/**
 * Color only on a TTY, and never with `NO_COLOR` set or `TERM=dumb` (see https://no-color.org).
 */
export function isColorEnabled(stream: NodeJS.WriteStream): boolean {
  return Boolean(stream.isTTY) && !process.env.NO_COLOR && process.env.TERM !== 'dumb';
}

/**
 * Prompting needs a TTY on both ends and no `CI`, since a prompt would hang a pipeline.
 * `--json` and `--yes` promise a run without questions.
 */
export function isInteractive({ json, yes = false }: InteractionOptions): boolean {
  return (
    Boolean(process.stdin.isTTY) &&
    Boolean(process.stdout.isTTY) &&
    !process.env.CI &&
    !json &&
    !yes
  );
}
