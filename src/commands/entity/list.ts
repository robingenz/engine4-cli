import { z } from 'zod';
import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { defineCommandOptions } from '../../utils/options';
import { printJson, printTable } from '../../utils/output';

export default defineCommand({
  description: 'List the entities with external API access.',
  examples: ['engine4 entity list', 'engine4 entity list --all --json'],
  options: defineCommandOptions({
    all: z.boolean().default(false).describe('Also list the entities without external API access.'),
  }),
  action: async (options) => {
    const { client, accessToken } = await createApiClient();
    const { items } = await client.getGenericEntities({ accessToken });
    const entities = options.all ? items : items.filter((item) => item.AllowExternalApi === true);
    if (options.json) {
      printJson({ items: entities });
    } else {
      printTable(entities, [
        { key: 'EntityId', header: 'ID' },
        { key: 'EntityName', header: 'Name' },
        { key: 'EntityFriendlyName', header: 'Friendly name' },
        { key: 'AllowExternalApi', header: 'External API' },
      ]);
    }
  },
});
