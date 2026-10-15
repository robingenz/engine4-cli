import { z } from 'zod';
import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { dataIdParam, defineCommandOptions, entityIdParam } from '../../utils/options';
import { printInfo, printJson } from '../../utils/output';
import { requireConfirmation } from '../../utils/prompts';

export default defineCommand({
  description: 'Delete one or more records.',
  examples: [
    'engine4 record delete --entity 1234 --data-id abcd',
    'engine4 record delete --entity 1234 --data-id abcd --data-id efgh --yes --json',
  ],
  options: defineCommandOptions({
    entity: entityIdParam,
    dataId: z.array(dataIdParam).min(1).describe('ID of the record. Repeatable.'),
    yes: z.boolean().default(false).describe('Skip the confirmation.'),
  }),
  action: async (options) => {
    const entityId = options.entity;
    const dataIds = options.dataId;
    await requireConfirmation(
      `Delete ${dataIds.length} record(s) from entity ${entityId}?`,
      options,
    );
    const { client, accessToken } = await createApiClient();
    const [dataId, ...otherDataIds] = dataIds;
    if (dataId !== undefined && otherDataIds.length === 0) {
      await client.delete({ accessToken, entityId, dataId });
    } else {
      await client.deleteMultiple({ accessToken, entityId, dataIds });
    }
    if (options.json) {
      printJson({ entityId, dataIds });
    } else {
      printInfo(`Deleted ${dataIds.length} record(s).`);
    }
  },
});
