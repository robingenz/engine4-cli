import { z } from 'zod';
import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { dataIdParam, defineCommandOptions, entityIdParam, rawParam } from '../../utils/options';
import { printJson, printRecords } from '../../utils/output';

export default defineCommand({
  description: 'Get one or more records by their IDs.',
  examples: [
    'engine4 record get --entity 1234 --data-id abcd',
    'engine4 record get --entity 1234 --data-id abcd --data-id efgh --json',
  ],
  options: defineCommandOptions({
    entity: entityIdParam,
    dataId: z.array(dataIdParam).min(1).describe('ID of the record. Repeatable.'),
    raw: rawParam,
  }),
  action: async (options) => {
    const { client, accessToken } = await createApiClient();
    const request = {
      accessToken,
      entityId: options.entity,
      convertAllCustomDataToStrings: !options.raw,
    };
    const [dataId, ...otherDataIds] = options.dataId;
    if (dataId !== undefined && otherDataIds.length === 0) {
      const { item } = await client.get({ ...request, dataId });
      if (options.json) {
        printJson({ item });
      } else {
        printRecords([item]);
      }
      return;
    }
    const { items } = await client.getMultiple({ ...request, dataIds: options.dataId });
    if (options.json) {
      printJson({ items });
    } else {
      printRecords(items);
    }
  },
});
