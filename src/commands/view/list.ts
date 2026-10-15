import { z } from 'zod';
import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { defineCommandOptions, entityIdParam } from '../../utils/options';
import { printJson, printTable } from '../../utils/output';

export default defineCommand({
  description: 'List the views of an entity.',
  examples: [
    'engine4 view list --entity 1234',
    'engine4 view list --entity 1234 --type List --json',
  ],
  options: defineCommandOptions({
    entity: entityIdParam,
    type: z.string().min(1).optional().describe('Only list views of this type, e.g. List.'),
  }),
  action: async (options) => {
    const { client, accessToken } = await createApiClient();
    const { items } = await client.getGenericViews({
      accessToken,
      entityId: options.entity,
      viewType: options.type,
    });
    if (options.json) {
      printJson({ items });
    } else {
      printTable(items, [
        { key: 'ViewId', header: 'ID' },
        { key: 'Name', header: 'Name' },
      ]);
    }
  },
});
