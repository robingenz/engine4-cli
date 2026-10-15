import { defineCommand } from 'zodline';
import { createApiClient } from '../../utils/api-client';
import { defineCommandOptions, viewIdParam } from '../../utils/options';
import { printJson, printRecords } from '../../utils/output';

export default defineCommand({
  description: 'List the fields (columns) shown in a view.',
  examples: ['engine4 view-field list --view 5678', 'engine4 view-field list --view 5678 --json'],
  options: defineCommandOptions({
    view: viewIdParam,
  }),
  action: async (options) => {
    const { client, accessToken } = await createApiClient();
    const { items } = await client.getGenericViewFields({ accessToken, viewId: options.view });
    if (options.json) {
      printJson({ items });
    } else {
      printRecords(items);
    }
  },
});
