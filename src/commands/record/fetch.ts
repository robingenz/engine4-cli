import { CompareOperator, type FetchFilterOptions } from 'engine4-node';
import { z } from 'zod';
import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { parseJsonFlag } from '../../utils/json';
import {
  columnNameParam,
  defineCommandOptions,
  entityIdParam,
  rawParam,
  skipParam,
  takeParam,
  viewIdParam,
} from '../../utils/options';
import { printInfo, printJson, printRecords } from '../../utils/output';

/** Conditions have no `logic`, so zod can tell them apart from groups and report precise errors. */
const filterConditionShape = {
  logic: z.undefined().optional(),
  genericName: columnNameParam,
};

const filterConditionSchema = z.discriminatedUnion(
  'compareOperator',
  [
    z.object({
      ...filterConditionShape,
      compareOperator: z.enum([
        CompareOperator.Equal,
        CompareOperator.NotEqual,
        CompareOperator.LessThan,
        CompareOperator.GreaterThan,
        CompareOperator.LessThanOrEqualTo,
        CompareOperator.GreaterThanOrEqualTo,
        CompareOperator.Like,
        CompareOperator.Contains,
      ]),
      value: z.string(),
    }),
    z.object({
      ...filterConditionShape,
      compareOperator: z.literal(CompareOperator.In),
      value: z.array(z.string()),
    }),
    z.object({
      ...filterConditionShape,
      compareOperator: z.enum([CompareOperator.IsNull, CompareOperator.IsNotNull]),
    }),
  ],
  { error: `Expected compareOperator to be one of ${Object.values(CompareOperator).join(', ')}` },
);

const filterSchema: z.ZodType<FetchFilterOptions> = z.lazy(() =>
  z.discriminatedUnion('logic', [
    filterConditionSchema,
    z.object({ logic: z.enum(['AND', 'OR']), groups: z.array(filterSchema).min(1) }),
  ]),
);

const sortParam = z
  .string()
  .regex(/^[^:]+(?::(?:asc|desc))?$/, 'Expected genericName or genericName:asc|desc')
  .transform((value) => {
    const [genericName, sort = 'asc'] = value.split(':');
    return { genericName, sort };
  })
  .pipe(z.object({ genericName: columnNameParam, sort: z.enum(['asc', 'desc']) }));

export default defineCommand({
  description: 'Fetch records of an entity with optional filter, sorting and paging.',
  examples: [
    'engine4 record fetch --entity 1234 --sort CreatedDate:desc --take 10',
    `engine4 record fetch --entity 1234 --filter '{"genericName":"Custom_001","compareOperator":"CONTAINS","value":"Smith"}' --json`,
  ],
  options: defineCommandOptions({
    entity: entityIdParam,
    view: viewIdParam
      .optional()
      .describe('ID of a view to fetch through. Returns the fields of the view.'),
    filter: z
      .string()
      .optional()
      .describe(
        'Filter as JSON: a condition {"genericName","compareOperator","value"} or a group {"logic":"AND"|"OR","groups":[...]}.',
      ),
    active: z
      .stringbool()
      .optional()
      .describe('true for active records only, false for deleted records only. Default: all.'),
    skip: skipParam,
    take: takeParam,
    sort: z
      .array(sortParam)
      .optional()
      .describe('Column to sort by, as genericName or genericName:asc|desc. Repeatable.'),
    longValues: z.boolean().default(false).describe('Also return the CustomMax_XXX values.'),
    raw: rawParam,
  }),
  action: async (options) => {
    const filter =
      options.filter === undefined
        ? undefined
        : parseJsonFlag('filter', options.filter, filterSchema);
    const { client, accessToken } = await createApiClient();
    const { items } = await client.fetch({
      accessToken,
      entityId: options.entity,
      viewId: options.view,
      filter,
      isActive: options.active ?? null,
      skip: options.skip,
      take: options.take,
      sorting: options.sort,
      withLongValues: options.longValues,
      convertAllCustomDataToStrings: !options.raw,
    });
    if (options.json) {
      printJson({ items, skip: options.skip, take: options.take });
      return;
    }
    printRecords(items);
    if (items.length === options.take) {
      printInfo(`Next page: --skip ${options.skip + options.take}`);
    }
  },
});
