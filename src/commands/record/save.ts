import type { SaveItem } from 'engine4-node';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { UsageError } from '../../utils/errors';
import { parseJsonFlag } from '../../utils/json';
import {
  columnNameParam,
  dataIdParam,
  defineCommandOptions,
  entityIdParam,
} from '../../utils/options';
import { printInfo, printJson, printRecords, printTable } from '../../utils/output';

const assignmentParam = z
  .string()
  .regex(/^[^=]+=/, 'Expected Column=value')
  .transform((assignment) => {
    const separatorIndex = assignment.indexOf('=');
    return [assignment.slice(0, separatorIndex), assignment.slice(separatorIndex + 1)];
  })
  .pipe(z.tuple([columnNameParam, z.string()]));

const fileItemSchema = z
  .object({ EntityId: entityIdParam.optional() })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]));

const fileSchema = z.union([fileItemSchema, z.array(fileItemSchema).min(1)]);

type FileItem = z.output<typeof fileItemSchema>;

export default defineCommand({
  description: 'Create or update records.',
  examples: [
    'engine4 record save --entity 1234 --set Custom_001=Smith --set Custom_002=open',
    'engine4 record save --entity 1234 --file records.json --return full --json',
  ],
  options: defineCommandOptions({
    entity: entityIdParam,
    dataId: dataIdParam
      .optional()
      .describe('ID of the record to update. Creates a new record if left out.'),
    set: z
      .array(assignmentParam)
      .optional()
      .describe('Value to save, as Column=value, e.g. Custom_001=Smith. Repeatable.'),
    file: z
      .string()
      .min(1)
      .optional()
      .describe('Path to a JSON file with one record or an array of records to save.'),
    return: z
      .enum(['none', 'dataId', 'full'])
      .default('dataId')
      .describe('What to return of the saved records.'),
  }),
  action: async (options) => {
    const items = resolveItems(options);
    const { client, accessToken } = await createApiClient();
    const { items: savedItems } = await client.saveAll({
      accessToken,
      items,
      returnType: options.return,
    });
    if (options.json) {
      printJson({ items: savedItems });
    } else if (options.return === 'dataId') {
      printTable(savedItems, [
        { key: 'DataId', header: 'DataId' },
        { key: 'EntityId', header: 'EntityId' },
      ]);
    } else if (options.return === 'full') {
      printRecords(savedItems);
    } else {
      printInfo(`Saved ${items.length} record(s).`);
    }
  },
});

function resolveItems(options: {
  entity: string;
  dataId?: string;
  set?: [string, string][];
  file?: string;
}): SaveItem[] {
  if (options.set && options.file) {
    throw new UsageError('Pass either --set or --file, not both.');
  }
  if (options.set) {
    return [
      {
        ...Object.fromEntries(options.set),
        EntityId: options.entity,
        DataId: options.dataId,
      },
    ];
  }
  if (options.file) {
    if (options.dataId) {
      throw new UsageError(
        '--data-id only works with --set. Put the DataId into the file instead.',
      );
    }
    return readItemsFile(options.file).map((item) => ({
      ...item,
      EntityId: item.EntityId ?? options.entity,
    }));
  }
  throw new UsageError('Missing --set or --file.');
}

function readItemsFile(path: string): FileItem[] {
  let json: string;
  try {
    json = readFileSync(path, 'utf8');
  } catch (error) {
    throw new UsageError(`--file: Cannot read ${path}.`, error);
  }
  const items = parseJsonFlag('file', json, fileSchema);
  return Array.isArray(items) ? items : [items];
}
