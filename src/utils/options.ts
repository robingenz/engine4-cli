import type { GenericColumnName } from 'engine4-node';
import { z } from 'zod';
import { defineOptions } from 'zodline';

const globalOptionsShape = {
  json: z.boolean().default(false).describe('Print the result as JSON.'),
};

/**
 * The options of a command: its own, then the global ones every command accepts.
 */
export function defineCommandOptions<Shape extends z.ZodRawShape>(
  shape: Shape,
  aliases?: Record<string, string>,
) {
  return defineOptions(z.object({ ...shape, ...globalOptionsShape }), aliases);
}

const SYSTEM_COLUMN_NAMES = [
  'CreatedBy',
  'CreatedById',
  'CreatedDate',
  'DataId',
  'DisplayValue',
  'EntityId',
  'EntryTime',
  'HasWriteAccess',
  'IsActive',
  'MandatorId',
  'ModifiedBy',
  'ModifiedById',
  'ModifiedDate',
  'OrgUnitId',
  'TriggerStamp',
  'UserId',
  'UserDisplayName',
] as const satisfies readonly GenericColumnName[];

/** Matches the system columns, `Custom_001` to `Custom_200` and `CustomMax_001` to `CustomMax_006`. */
const COLUMN_NAME_PATTERN = new RegExp(
  `^(?:${SYSTEM_COLUMN_NAMES.join('|')}|Custom_(?:00[1-9]|0[1-9]\\d|1\\d\\d|200)|CustomMax_00[1-6])$`,
);

export const entityIdParam = z.string().min(1).describe('ID of the entity.');

export const dataIdParam = z.string().min(1).describe('ID of the record.');

export const viewIdParam = z.string().min(1).describe('ID of the view.');

export const columnNameParam = z
  .string()
  .regex(COLUMN_NAME_PATTERN, 'Expected a generic column name such as Custom_001 or CreatedDate')
  // The pattern only accepts generic column names, which TypeScript cannot infer from a regex.
  .transform((name) => name as GenericColumnName)
  .describe('Generic column name, e.g. Custom_001, CustomMax_001 or CreatedDate.');

export const skipParam = z.coerce
  .number()
  .int()
  .min(0)
  .default(0)
  .describe('Number of records to skip.');

export const takeParam = z.coerce
  .number()
  .int()
  .min(1)
  .max(1000)
  .default(50)
  .describe('Maximum number of records to return, between 1 and 1000.');

export const rawParam = z
  .boolean()
  .default(false)
  .describe('Return custom values with their data types instead of as strings.');
