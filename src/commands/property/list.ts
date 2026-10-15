import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { defineCommandOptions, entityIdParam } from '../../utils/options';
import { printJson, printTable } from '../../utils/output';

export default defineCommand({
  description: 'List the properties (columns) of an entity.',
  examples: ['engine4 property list --entity 1234', 'engine4 property list --entity 1234 --json'],
  options: defineCommandOptions({
    entity: entityIdParam,
  }),
  action: async (options) => {
    const { client, accessToken } = await createApiClient();
    const { items } = await client.getGenericProperties({ accessToken, entityId: options.entity });
    if (options.json) {
      printJson({ items });
    } else {
      printTable(items, [
        { key: 'GenericColumnName', header: 'Column' },
        { key: 'PropertyName', header: 'Name' },
        { key: 'DataType', header: 'Data type' },
        { key: 'IsRequired', header: 'Required' },
        { key: 'LookupEntityId', header: 'Lookup entity' },
      ]);
    }
  },
});
