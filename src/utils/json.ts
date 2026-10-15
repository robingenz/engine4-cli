import { z } from 'zod';
import { UsageError } from './errors';

/**
 * Parses the JSON passed to a flag and validates it. Fails naming the flag and the invalid paths.
 */
export function parseJsonFlag<Schema extends z.ZodType>(
  flag: string,
  json: string,
  schema: Schema,
): z.output<Schema> {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new UsageError(`--${flag}: Expected valid JSON.`, error);
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new UsageError(`--${flag}: ${formatIssues(result.error)}`, result.error);
  }
  return result.data;
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map(({ path, message }) =>
      path.length > 0 ? `${z.core.toDotPath(path)}: ${message}` : message,
    )
    .join('; ');
}
